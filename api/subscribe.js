// Vercel Serverless Function for newsletter subscriptions
// Replaces Formspree with custom backend

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    // Validate email
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    // Basic rate limiting check (Vercel has built-in DDoS protection)
    // TODO: Add more sophisticated rate limiting if needed

    // Honeypot spam protection (add hidden field in form)
    if (req.body.website) {
      // Bots fill honeypot fields, real users don't see them
      return res.status(200).json({ success: true }); // Pretend success
    }

    // TODO: Integrate with your email service
    // Options: Mailchimp, ConvertKit, Buttondown, SendGrid, etc.
    // For now, we'll just log it (replace with actual integration)

    console.log('New subscriber:', email);

    // Example: Send to Formspree as backup during transition
    // You can remove this once you've set up a proper email service
    const formspreeResponse = await fetch('https://formspree.io/f/meeeazrq', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    if (!formspreeResponse.ok) {
      throw new Error('Email service error');
    }

    return res.status(200).json({
      success: true,
      message: 'Thank you for subscribing!'
    });

  } catch (error) {
    console.error('Subscribe error:', error);
    return res.status(500).json({
      error: 'Something went wrong. Please try again.'
    });
  }
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
