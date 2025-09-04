export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      res.status(200).json({ 
        message: 'RidyShidy API is working!',
        timestamp: new Date().toISOString(),
        method: req.method 
      });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
