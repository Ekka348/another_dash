
let lastPayload = null;

export default function handler(req, res) {
  if (req.method === 'POST') {
    lastPayload = req.body;
    console.log('Webhook received:', lastPayload);
    res.status(200).end();
  } else {
    res.status(405).send('Method Not Allowed');
  }
}
