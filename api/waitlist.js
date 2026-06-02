export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  // Basic server-side email validation
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_NAME = 'tblBkRG0ENi5l0TY9';

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.error('Missing Airtable environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const airtableHeaders = {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const baseUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;

  try {
    // --- Step 1: Check for duplicate email ---
    const checkUrl = `${baseUrl}?filterByFormula=${encodeURIComponent(`{Email}="${email}"`)}`;
    const checkRes = await fetch(checkUrl, { headers: airtableHeaders });

    if (!checkRes.ok) {
      const err = await checkRes.json();
      console.error('Airtable check error:', err);
      return res.status(502).json({ error: 'Failed to check waitlist' });
    }

    const checkData = await checkRes.json();

    if (checkData.records && checkData.records.length > 0) {
      // Email already exists — don't create a duplicate
      return res.status(409).json({ duplicate: true });
    }

    // --- Step 2: Create new record ---
    const createRes = await fetch(baseUrl, {
      method: 'POST',
      headers: airtableHeaders,
      body: JSON.stringify({
        records: [
          {
            fields: {
              Email: email,
            },
          },
        ],
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      console.error('Airtable create error:', err);
      return res.status(502).json({ error: 'Failed to join waitlist' });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
