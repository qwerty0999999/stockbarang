export async function sendWhatsAppAlert(phone: string, message: string) {
	const token = process.env.FONNTE_TOKEN;
	if (!token) return;

	try {
		await fetch('https://api.fonnte.com/send', {
			method: 'POST',
			headers: {
				'Authorization': token,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				target: phone,
				message: message
			})
		});
	} catch (err) {
		console.error('Failed to send WhatsApp alert', err);
	}
}
