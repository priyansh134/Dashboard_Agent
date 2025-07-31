from flask import Flask, request, jsonify, render_template, Response
from flask_cors import CORS
import duckdb
import pandas as pd
import os
import google.generativeai as genai
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader
from cloudinary.utils import cloudinary_url

# Load environment variables from .env file
load_dotenv()

# Cloudinary configuration using environment variables
google_api_key = os.getenv("GOOGLE_API_KEY")
cloudinary_cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
cloudinary_api_key = os.getenv("CLOUDINARY_API_KEY")
cloudinary_api_secret = os.getenv("CLOUDINARY_API_SECRET")
cloudinary.config(
    cloud_name=cloudinary_cloud_name,
    api_key=cloudinary_api_key,
    api_secret=cloudinary_api_secret,
    secure=True
)

# Initialize Flask app
app = Flask(__name__)

# Enable Cross-Origin Resource Sharing (CORS) for all routes
cors = CORS(app, origins="*")

# Health check route
@app.route('/', methods=['GET'])
def home():
    """
    Basic health check endpoint to confirm the server is operational.
    """
    return jsonify({"message": "Server running successfully"})

# Route for uploading files to Cloudinary
@app.route('/upload_file', methods=['POST'])
def upload_file():
    """
    Uploads files to Cloudinary as raw resources and provides the public URL of the uploaded file.
    """
    # Check if the file is present in the request
    if 'file' not in request.files:
        return jsonify({"error": "No file provided."}), 400

    csv_file = request.files['file']
    # Check if the user has selected a file
    if csv_file.filename == '':
        return jsonify({"error": "No selected file."}), 400

    try:
        # Upload the file to Cloudinary
        upload_result = cloudinary.uploader.upload(
            csv_file,
            resource_type="raw",
            public_id=csv_file.filename.split('.')[0]
        )
        # Return success message and file URL
        return jsonify({"message": "File uploaded successfully!", "filePath": upload_result["secure_url"]}), 200
    except Exception as e:
        # Handle errors during the upload process
        return jsonify({"error": f"Error uploading to Cloudinary: {str(e)}"}), 500

# Route for generating SQL queries based on user input
@app.route('/generate_sql', methods=['POST'])
def generate_sql():
    """
   Generates an SQL query from user input and the structure of the uploaded CSV file, 
   executes it with DuckDB, and returns the result as a downloadable CSV.
    """
    # Configure the Generative AI model with the provided API key
    genai.configure(api_key=google_api_key)
    model = genai.GenerativeModel("gemini-2.0-flash-exp")

    # Parse JSON data from the request
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({"error": "Missing text input."}), 400

    text_input = data['text']

    # Validate if the file path is included in the request
    if not data or 'filePath' not in data:
        return jsonify({"error": "No file uploaded. Please upload a file first."}), 400

    filePath = data['filePath']

    try:
        # Read the uploaded CSV file into a Pandas DataFrame
        df = pd.read_csv(filePath)
    except Exception as e:
        # Handle errors during file reading
        return jsonify({"error": f"Error reading CSV file: {str(e)}"}), 400

    # Generate a prompt for the AI model based on the user input and CSV structure
    prompt = (
    f"Given the following text request: \"{text_input}\" and the structure of this CSV file: {df.head().to_string(index=False)}, "
    f"generate an SQL query using the table name `uploaded_csv`. Use appropriate aliases where necessary, and keep the column names exactly as they are, without adding any characters or removing white spaces. "
    f"Provide only the SQL query, without any additional explanation."
)


    try:
        # Generate SQL query using the AI model
        response = model.generate_content(prompt)
        sql_query = response.text
        print(f"Generated SQL query: {sql_query}")
    except Exception as e:
        # Handle errors during query generation
        return jsonify({"error": f"Error generating SQL: {str(e)}"}), 500

    # Clean up the generated SQL query
    sql_query = sql_query.replace("```", "").replace("sql", "").replace("\n", " ").strip()
    sql_query = sql_query.replace("your_table_name", "uploaded_csv")

    # Execute the SQL query using DuckDB
    try:
        conn = duckdb.connect()
        conn.register('uploaded_csv', df)  # Register the DataFrame as a table in DuckDB
        output_table = conn.execute(sql_query).fetchdf()  # Execute the query and fetch the result
    except Exception as e:
        # Handle errors during query execution
        return jsonify({"error": f"Error executing SQL: {str(e)}"}), 500

    # Convert the result table to CSV format
    csv_data = output_table.to_csv(index=False)

    # Return the result as a downloadable CSV file
    return Response(
        csv_data,
        mimetype='text/csv',
        headers={"Content-Disposition": "attachment; filename=output.csv"}
    )

# Main entry point for the application
if __name__ == '__main__':
    # Run the Flask app on the specified port, defaulting to 8080
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)