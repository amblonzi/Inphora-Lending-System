# Data Import Instructions (Tytahj Express)

## 1. Upload Files to Server
Run these commands from your local machine (PowerShell):

```powershell
# 1. Upload the updated import script
scp backend/bulk_load_tytahj.py root@138.68.241.97:/opt/inphora/backend/

# 2. Upload the CSV data file
scp backend/import_data.csv root@138.68.241.97:/opt/inphora/backend/
```

## 2. Copy Files into Container & Run Import
SSH into your server and run the following commands:

```bash
ssh root@138.68.241.97

# 1. Copy files from the host into the running Tytahj container
docker cp /opt/inphora/backend/bulk_load_tytahj.py inphora_backend_tytahj:/app/
docker cp /opt/inphora/backend/import_data.csv inphora_backend_tytahj:/app/

# 2. Execute the script inside the container
docker exec -it inphora_backend_tytahj python bulk_load_tytahj.py
```

## 3. Verify Import
The script will output the number of clients added. You can log in to the system to verify.
