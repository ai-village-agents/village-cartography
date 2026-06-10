export default {
  async fetch(request, env, ctx) {
    // Fetch the live status from Doorwatch
    const doorwatchRes = await fetch('https://village-doorwatch.aivillage.workers.dev/json', {
      headers: { 'user-agent': 'AI-Village-Cartographer/1.0' },
      cf: { cacheTtl: 0 }
    });
    
    if (!doorwatchRes.ok) {
      return new Response('Failed to load doorwatch data', { status: 500 });
    }
    
    const data = await doorwatchRes.json();
    const results = data.results || [];
    
    // SVG Dimensions
    const width = 800;
    const height = 600;
    
    // Central node (Doorwatch)
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
    
    // Draw edges
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
    
    // Draw central node
    svg += `<circle cx="${cx}" cy="${cy}" r="30" fill="#1e222d" stroke="#8ec5ff" stroke-width="3" filter="url(#glow)" />`;
    svg += `<text x="${cx}" y="${cy + 5}" fill="#8ec5ff" font-family="monospace" font-size="24" text-anchor="middle">🐝</text>`;
    svg += `<text x="${cx}" y="${cy + 45}" fill="#8ec5ff" font-family="monospace" font-size="12" text-anchor="middle">Doorwatch</text>`;
    
    // Draw child nodes
    results.forEach((item, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      
      const isOk = item.ok || item.retry_ok;
      const fillColor = isOk ? "#1b3320" : "#331b1b";
      const strokeColor = isOk ? "#4caf50" : "#f44336";
      
      // Node circle
      svg += `<circle cx="${x}" cy="${y}" r="20" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />`;
      
      // Status dot
      svg += `<circle cx="${x}" cy="${y}" r="6" fill="${strokeColor}" filter="url(#glow)" />`;
      
      // Label
      let textAnchor = "middle";
      let textX = x;
      let textY = y + 35; // Default bottom
      
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      // Right side
      if (cos > 0.3) { 
        textAnchor = "start"; 
        textX = x + 25; 
        textY = y + 4; 
      }
      // Left side
      else if (cos < -0.3) { 
        textAnchor = "end"; 
        textX = x - 25; 
        textY = y + 4; 
      }
      // Top/Bottom adjustments to prevent clipping/overlap
      else {
        if (sin < 0) {
            textY = y - 25; // Top
        } else {
            // Need to stagger the bottom ones if they are too close
            if (Math.abs(cos) < 0.15) {
                 textY = y + 35;
            } else if (cos > 0) {
                 textAnchor = "start";
                 textX = x + 15;
                 textY = y + 25;
            } else {
                 textAnchor = "end";
                 textX = x - 15;
                 textY = y + 25;
            }
        }
      }

      // Specific fix for the overlapping "Village Showcase" and "Unsent Letters" if they are at specific angles
      // Actually, since results change dynamically, a programmatic fix is better. The adjustments above might be enough.
      
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
