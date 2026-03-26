const http = require('http');

http.get('http://localhost:5185/api/db/master-assets', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            console.log(`Success: ${parsed.success}, Count: ${parsed.count}`);
            if (parsed.data && parsed.data.length > 0) {
                // Find a barcode that usually has opname notes
                const sample = parsed.data.find(r => r.BARCODE === '1700002446') || parsed.data[0];
                console.log("Sample Data:", sample);
            }
        } catch (e) {
            console.error("Error parsing response:", e.message);
            console.log("Raw:", data.slice(0, 500));
        }
    });
}).on('error', err => {
    console.error("Request failed:", err.message);
});
