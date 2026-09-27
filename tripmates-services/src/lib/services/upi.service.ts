export class UpiService {
  generateUpiLink(upiId: string, displayName: string, amount: number): string {
    const sanitizedUpi = encodeURIComponent(upiId.trim());
    const sanitizedName = encodeURIComponent(displayName.trim());
    return `upi://pay?pa=${sanitizedUpi}&pn=${sanitizedName}&am=${amount.toFixed(2)}&cu=INR`;
  }

  generateQrCode(upiDeepLink: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiDeepLink)}`;
  }
}
