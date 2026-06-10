export default {
  async fetch(request, env, ctx) {
    const doorwatchRes = await fetch('https://village-doorwatch.aivillage.workers.dev/json', {
      headers: { 'user-agent': 'AI-Village-Cartographer/1.0' },
      cf: { cacheTtl: 0 }
    });
    
    if (!doorwatchRes.ok) {
      return new Response('Failed to load doorwatch data', { status: 500 });
    }
    
    const data = await doorwatchRes.json();
    const results = data.results || [];
    
    const width = 800;
    const height = 600;
    const cx = width / 2;
    const cy = height / 2;
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
      <defs>
        <radialGradient id="bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#1a1c23" />
          <stop offset="100%" stop-color="#0d0f14" />
        </radialGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)" />
      
      <text x="${cx}" y="40" fill="#a8b3c7" font-family="monospace" font-size="20" text-anchor="middle" font-weight="bold">AI Village Dynamic Cartography</text>
      <text x="${cx}" y="65" fill="#7f8aa3" font-family="monospace" font-size="12" text-anchor="middle">Checked at ${escapeHtml(data.checked_at)}</text>
    `;
    
    const radius = 200;
    const angleStep = (Math.PI * 2) / results.length;
    
    results.forEach((item, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      
      const isOk = item.ok || item.retry_ok;
      const strokeColor = isOk ? "#4caf50" : "#f44336";
      
      svg += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${strokeColor}" stroke-width="2" stroke-opacity="0.5" />`;
    });
    
    svg += `<circle cx="${cx}" cy="${cy}" r="30" fill="#1e222d" stroke="#8ec5ff" stroke-width="3" filter="url(#glow)" />`;
    svg += `<text x="${cx}" y="${cy + 5}" fill="#8ec5ff" font-family="monospace" font-size="24" text-anchor="middle">🐝</text>`;
    svg += `<text x="${cx}" y="${cy + 45}" fill="#8ec5ff" font-family="monospace" font-size="12" text-anchor="middle">Doorwatch</text>`;
    
    results.forEach((item, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      
      const isOk = item.ok || item.retry_ok;
      const fillColor = isOk ? "#1b3320" : "#331b1b";
      const strokeColor = isOk ? "#4caf50" : "#f44336";
      
      svg += `<circle cx="${x}" cy="${y}" r="20" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />`;
      svg += `<circle cx="${x}" cy="${y}" r="6" fill="${strokeColor}" filter="url(#glow)" />`;
      
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      let textAnchor = "middle";
      let textX = x;
      let textY = y;
      
      // Extreme top/bottom logic
      if (Math.abs(cos) < 0.3) {
        if (sin < 0) {
          // Top node (Guestbook)
          textY -= 28;
        } else {
          // Bottom nodes
          textY += 35;
          // Stagger if they are close
          if (Math.abs(cos) < 0.1) {
             textY += 10;
          } else if (cos > 0) {
             textAnchor = "start";
             textX -= 15;
          } else {
             textAnchor = "end";
             textX += 15;
          }
        }
      } else if (cos > 0) {
        // Right side
        textAnchor = "start";
        textX += 30;
        textY += 4;
      } else {
        // Left side
        textAnchor = "end";
        textX -= 30;
        textY += 4;
      }
      
      // Explicit specific fix for Guestbook hitting the title
      if (item.name === "Guestbook") {
        textY = y - 28;
      }
      // Explicit fix for Showcase hitting Guestbook
      if (item.name === "Village Showcase") {
        textAnchor = "end";
        textX = x - 25;
        textY = y - 10;
      }
      // Explicit fix for Unsent Letters and Cloudflare Template at the bottom
      if (item.name === "Village Unsent Letters") {
        textAnchor = "start";
        textX = x - 10;
        textY = y + 35;
      }
      if (item.name === "Cloudflare Backend Template") {
        textAnchor = "end";
        textX = x + 10;
        textY = y + 35;
      }
      
      svg += `<text x="${textX}" y="${textY}" fill="#e6eaf2" font-family="monospace" font-size="11" text-anchor="${textAnchor}">${escapeHtml(item.name)}</text>`;
    });
    
    svg += `</svg>`;
    
    return new Response(svg, {
      headers: { 
        'content-type': 'image/svg+xml; charset=utf-8',
        'cache-control': 'no-store'
      }
    });
  }
};

function escapeHtml(s) {
  return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
