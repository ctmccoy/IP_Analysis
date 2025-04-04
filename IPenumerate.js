// IEnumerate.js - Parses Wireshark CSV and shows Time, Source, Protocol, Destination

document.getElementById("csvFileInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const csv = event.target.result;
    const rows = csv.split("\n").map(row => row.split(","));
    const headers = rows[0];

    // Identify needed columns
    const timeIndex = headers.findIndex(h => h.trim().toLowerCase().includes("time"));
    const srcIndex = headers.findIndex(h => h.trim().toLowerCase().includes("source"));
    const protoIndex = headers.findIndex(h => h.trim().toLowerCase().includes("protocol"));
    const dstIndex = headers.findIndex(h => h.trim().toLowerCase().includes("destination"));

    let html = "<table><thead><tr><th>Time</th><th>Source</th><th>Protocol</th><th>Destination</th></tr></thead><tbody>";

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < Math.max(timeIndex, srcIndex, protoIndex, dstIndex)) continue;
      const time = row[timeIndex]?.trim();
      const source = row[srcIndex]?.trim();
      const protocol = row[protoIndex]?.trim();
      const destination = row[dstIndex]?.trim();
      if (time && source && protocol && destination) {
        html += `<tr><td>${time}</td><td>${source}</td><td>${protocol}</td><td>${destination}</td></tr>`;
      }
    }

    html += "</tbody></table>";
    document.getElementById("output").innerHTML = html;
  };

  reader.readAsText(file);
});
