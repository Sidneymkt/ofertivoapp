import QRCode from 'qrcode';

/**
 * Generates a PIX BR Code (EMV standard) payload string.
 * This creates a static PIX payment string that encodes into a valid QR code.
 */
function generatePixPayload(
  pixKeyType: string,
  pixKeyValue: string,
  merchantName: string,
  amount: number,
  txId: string,
  city: string = 'MANAUS'
): string {
  // EMV format helper: ID + Length (2 digits) + Value
  const emvField = (id: string, value: string) => {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  };

  // Determine GUI key info (always use BR Code standard GUI)
  const gui = '0014br.gov.bcb.pix';
  const keyField = emvField('01', pixKeyValue);

  // Merchant Account Information (ID 26)
  const merchantAccountInfo = gui + keyField;

  // Transaction amount
  const amountStr = amount.toFixed(2);

  // Additional Data (ID 62) - txId
  const cleanTxId = txId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25);
  const additionalData = emvField('05', cleanTxId);

  // Clean merchant name (max 25 chars, no special chars)
  const cleanName = merchantName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .substring(0, 25)
    .toUpperCase();

  const cleanCity = city
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .substring(0, 15)
    .toUpperCase();

  // Build payload without CRC
  let payload = '';
  payload += emvField('00', '01'); // Payload Format Indicator
  payload += emvField('26', merchantAccountInfo); // Merchant Account Info
  payload += emvField('52', '0000'); // Merchant Category Code
  payload += emvField('53', '986'); // Transaction Currency (BRL)
  payload += emvField('54', amountStr); // Transaction Amount
  payload += emvField('58', 'BR'); // Country Code
  payload += emvField('59', cleanName); // Merchant Name
  payload += emvField('60', cleanCity); // Merchant City
  payload += emvField('62', additionalData); // Additional Data

  // CRC16 placeholder
  payload += '6304';

  // Calculate CRC16 (CCITT-FALSE)
  const crc = crc16ccitt(payload);
  payload = payload.slice(0, -4) + '6304' + crc;

  return payload;
}

function crc16ccitt(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generates a PIX QR Code as a data URL image.
 */
export async function generatePixQrCodeDataUrl(
  pixKey: { type: string; value: string; holder: string },
  amount: number,
  txId: string
): Promise<string> {
  const payload = generatePixPayload(
    pixKey.type,
    pixKey.value,
    pixKey.holder || 'OFERTIVO',
    amount,
    txId
  );

  const dataUrl = await QRCode.toDataURL(payload, {
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  });

  return dataUrl;
}
