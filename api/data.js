export default function handler(req, res) {
  res.status(200).json(lastPayload || { status: 'waiting for Bitrix webhook' });
}

