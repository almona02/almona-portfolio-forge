import axios from 'axios';

const SMS_API_URL = import.meta.env.VITE_SMS_API_URL || '';
const SMS_API_KEY = import.meta.env.VITE_SMS_API_KEY || '';

interface SmsPayload {
  to: string;
  message: string;
}

export const sendSms = async ({ to, message }: SmsPayload): Promise<boolean> => {
  if (!SMS_API_URL || !SMS_API_KEY) {
    console.error('SMS API URL or API Key is not configured');
    return false;
  }

  try {
    const response = await axios.post(
      SMS_API_URL,
      {
        to,
        message,
      },
      {
        headers: {
          'Authorization': `Bearer ${SMS_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 200) {
      return true;
    } else {
      console.error('Failed to send SMS:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
};
