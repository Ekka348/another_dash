export default async function handler(req, res) {
  const BITRIX_WEBHOOK = process.env.BITRIX_WEBHOOK;

  const response = await fetch(`${BITRIX_WEBHOOK}/crm.lead.list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      select: ['ID', 'TITLE', 'STATUS_ID'],
      order: { ID: 'DESC' }
    })
  });

  const data = await response.json();
  res.status(200).json(data.result);
}
