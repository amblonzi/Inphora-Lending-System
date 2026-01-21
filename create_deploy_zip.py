import zipfile
import os

def zip_project(output_filename="deploy_package.zip"):
    # List of files and folders to include
    include_paths = [
        "backend",
        "frontend",
        "nginx",
        "docker-compose.yml",
        "env.example.production",
        "init_ssl.sh"
    ]
    
    # Items to exclude specifically if found inside included folders
    exclude_patterns = [
        "node_modules",
        "__pycache__",
        ".venv",
        ".git",
        "dist",
        "build",
        ".DS_Store"
    ]

    print(f"Creating {output_filename}...")
    
    with zipfile.ZipFile(output_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for item in include_paths:
            if os.path.isfile(item):
                print(f"Adding file: {item}")
                zipf.write(item)
            elif os.path.isdir(item):
                print(f"Adding folder: {item}")
                for root, dirs, files in os.walk(item):
                    # Modify dirs in-place to skip excluded directories
                    dirs[:] = [d for d in dirs if d not in exclude_patterns]
                    
                    for file in files:
                        if file in exclude_patterns:
                            continue
                        
                        file_path = os.path.join(root, file)
                        # Archive name should match the structure relative to project root
                        zipf.write(file_path)
            else:
                print(f"Warning: {item} not found, skipping.")

    print(f"Success! Created {output_filename}")

if __name__ == "__main__":
    zip_project()
