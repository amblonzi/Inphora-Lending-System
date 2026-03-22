import requests
from requests.auth import HTTPBasicAuth
from datetime import datetime
import base64
from typing import Optional, Dict, Any
import json

class MpesaService:
    def __init__(self, consumer_key: str, consumer_secret: str, shortcode: str, passkey: str, env: str = "sandbox", initiator_name: str = "testapi", initiator_password: str = None):
        self.consumer_key = consumer_key
        self.consumer_secret = consumer_secret
        self.shortcode = shortcode
        self.passkey = passkey
        self.initiator_name = initiator_name
        self.initiator_password = initiator_password
        self.base_url = "https://sandbox.safaricom.co.ke" if env == "sandbox" else "https://api.safaricom.co.ke"

    def generate_security_credential(self, certificate_data: str = None) -> str:
        """
        Generates the encrypted security credential for B2C/Account Balance/Transaction Status.
        In sandbox, it often uses a fixed credential if not provided.
        """
        if not self.initiator_password:
            return "S9Yf4..." # Placeholder or default for sandbox if needed
            
        from cryptography.hazmat.primitives import serialization, hashes
        from cryptography.hazmat.primitives.asymmetric import padding
        from cryptography.hazmat.backends import default_backend
        import base64

        try:
            # If certificate_data is provided (PEM format), use it. 
            # Otherwise, use a default if available (NOT RECOMMENDED for production)
            if not certificate_data:
                return self.initiator_password # Fallback for simple cases if allowed
                
            public_key = serialization.load_pem_public_key(certificate_data.encode(), default_backend())
            
            encrypted = public_key.encrypt(
                self.initiator_password.encode(),
                padding.PKCS1v15()
            )
            return base64.b64encode(encrypted).decode('utf-8')
        except Exception as e:
            print(f"Error generating security credential: {e}")
            return self.initiator_password

    def get_access_token(self) -> str:
        url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        response = requests.get(url, auth=HTTPBasicAuth(self.consumer_key, self.consumer_secret))
        response.raise_for_status()
        return response.json()["access_token"]

    def register_url(self, confirmation_url: str, validation_url: str):
        access_token = self.get_access_token()
        url = f"{self.base_url}/mpesa/c2b/v1/registerurl"
        headers = {"Authorization": f"Bearer {access_token}"}
        payload = {
            "ShortCode": self.shortcode,
            "ResponseType": "Completed",
            "ConfirmationURL": confirmation_url,
            "ValidationURL": validation_url
        }
        response = requests.post(url, json=payload, headers=headers)
        return response.json()

    def get_stk_push_password(self) -> tuple:
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password_str = self.shortcode + self.passkey + timestamp
        password = base64.b64encode(password_str.encode()).decode('utf-8')
        return password, timestamp

    def stk_push(self, phone: str, amount: int, callback_url: str, reference: str, description: str):
        access_token = self.get_access_token()
        url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
        headers = {"Authorization": f"Bearer {access_token}"}
        password, timestamp = self.get_stk_push_password()
        
        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount,
            "PartyA": phone,
            "PartyB": self.shortcode,
            "PhoneNumber": phone,
            "CallBackURL": callback_url,
            "AccountReference": reference,
            "TransactionDesc": description
        }
        response = requests.post(url, json=payload, headers=headers)
        return response.json()

    def initiate_b2c(self, phone: str, amount: int, command_id: str, remarks: str, occasion: str, callback_url: str, security_credential: str = None):
        access_token = self.get_access_token()
        url = f"{self.base_url}/mpesa/b2c/v1/paymentrequest"
        headers = {"Authorization": f"Bearer {access_token}"}
        
        if not security_credential:
            security_credential = self.generate_security_credential()

        payload = {
            "InitiatorName": self.initiator_name, 
            "SecurityCredential": security_credential,
            "CommandID": command_id, 
            "Amount": int(amount),
            "PartyA": self.shortcode,
            "PartyB": phone,
            "Remarks": remarks,
            "QueueTimeOutURL": callback_url,
            "ResultURL": callback_url,
            "Occasion": occasion
        }
        response = requests.post(url, json=payload, headers=headers)
        return response.json()

    def get_account_balance(self, callback_url: str, security_credential: str = None):
        access_token = self.get_access_token()
        url = f"{self.base_url}/mpesa/accountbalance/v1/query"
        headers = {"Authorization": f"Bearer {access_token}"}

        if not security_credential:
            security_credential = self.generate_security_credential()

        payload = {
            "Initiator": self.initiator_name,
            "SecurityCredential": security_credential,
            "CommandID": "AccountBalance",
            "PartyA": self.shortcode,
            "IdentifierType": "4",
            "Remarks": "Balance Query",
            "QueueTimeOutURL": callback_url,
            "ResultURL": callback_url
        }
        response = requests.post(url, json=payload, headers=headers)
        return response.json()

    def check_transaction_status(self, transaction_id: str, callback_url: str, security_credential: str = None):
        access_token = self.get_access_token()
        url = f"{self.base_url}/mpesa/transactionstatus/v1/query"
        headers = {"Authorization": f"Bearer {access_token}"}

        if not security_credential:
            security_credential = self.generate_security_credential()

        payload = {
            "Initiator": self.initiator_name,
            "SecurityCredential": security_credential,
            "CommandID": "TransactionStatusQuery",
            "TransactionID": transaction_id,
            "PartyA": self.shortcode,
            "IdentifierType": "1",
            "Remarks": "Status Query",
            "Occasion": "Status Query",
            "QueueTimeOutURL": callback_url,
            "ResultURL": callback_url
        }
        response = requests.post(url, json=payload, headers=headers)
        return response.json()
