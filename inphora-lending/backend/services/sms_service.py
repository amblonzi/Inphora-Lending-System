import os
import requests
import json
from typing import Optional

class SmsService:
    def __init__(self, provider: str = "simulator", api_key: Optional[str] = None, username: Optional[str] = None):
        self.provider = provider
        self.api_key = api_key
        self.username = username
        self.simulate = provider == "simulator"

    def send_sms(self, phone: str, message: str) -> dict:
        """
        Send SMS to a phone number.
        """
        print(f"SMS SERVICE [{self.provider}]: Sending to {phone} -> {message}")
        
        if self.simulate:
            return {"status": "success", "message": "SMS simulated", "provider": "simulator"}

        if self.provider == "africastalking":
            return self._send_africastalking(phone, message)
        
        return {"status": "error", "message": f"Provider {self.provider} not implemented"}

    def _send_africastalking(self, phone: str, message: str) -> dict:
        """
        Send SMS via Africa's Talking API.
        """
        if not self.api_key or not self.username:
            return {"status": "error", "message": "Missing AT credentials"}
            
        url = "https://api.africastalking.com/version1/messaging"
        headers = {
            "ApiKey": self.api_key,
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
        }
        data = {
            "username": self.username,
            "to": phone,
            "message": message
        }
        
        try:
            response = requests.post(url, data=data, headers=headers)
            return response.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def format_phone(phone: str) -> str:
        """Format phone to E.164 standard (+254...)"""
        clean_phone = "".join(filter(str.isdigit, phone))
        if clean_phone.startswith("0"):
            return "+254" + clean_phone[1:]
        elif not clean_phone.startswith("254"):
             return "+254" + clean_phone
        elif not clean_phone.startswith("+"):
            return "+" + clean_phone
        return phone
