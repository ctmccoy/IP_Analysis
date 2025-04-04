// IPenumerate.js - Parses Wireshark CSV and shows Time, Source, Protocol, Destination + Filters + TXT Export + Charts

let globalData = {
  rows: [],
  indices: {},
};

// Load Chart.js
const chartScript = document.createElement("script");
chartScript.src = "https://cdn.jsdelivr.net/npm/chart.js";
document.head.appendChild(chartScript);

document.getElementById("csvFileInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const csv = event.target.result;
    const rows = csv.split("\n").map(row => row.split(","));
    const headers = rows[0];

    const timeIndex = headers.findIndex(h => h.trim().toLowerCase().includes("time"));
    const srcIndex = headers.findIndex(h => h.trim().toLowerCase().includes("source"));
    const protoIndex = headers.findIndex(h => h.trim().toLowerCase().includes("protocol"));
    const dstIndex = headers.findIndex(h => h.trim().toLowerCase().includes("destination"));

    globalData.rows = rows.slice(1);
    globalData.indices = { timeIndex, srcIndex, protoIndex, dstIndex };

    createFilterControls(globalData.rows);
    renderAll(globalData.rows);
  };

  reader.readAsText(file);
});

function createFilterControls(rows) {
  const { protoIndex } = globalData.indices;
  const protoSet = new Set();
  rows.forEach(row => {
    const proto = row[protoIndex]?.trim();
    if (proto) protoSet.add(proto);
  });

  let filterHtml = '<label for="protocolFilter"><strong>Filter by Protocol:</strong></label> ';
  filterHtml += '<select id="protocolFilter"><option value="all">All</option>';
  for (const proto of Array.from(protoSet).sort()) {
    filterHtml += `<option value="${proto}">${proto}</option>`;
  }
  filterHtml += '</select> ';

  filterHtml += '<label for="ipSearch"><strong>Search IP:</strong></label> ';
  filterHtml += '<input type="text" id="ipSearch" placeholder="Enter Source or Destination IP"> ';

  filterHtml += '<label for="startTime"><strong>Start Time:</strong></label> ';
  filterHtml += '<input type="text" id="startTime" placeholder="e.g. 10.001234"> ';
  filterHtml += '<label for="endTime"><strong>End Time:</strong></label> ';
  filterHtml += '<input type="text" id="endTime" placeholder="e.g. 12.543210"> ';

  filterHtml += '<button id="applyFilters">Apply Filters</button> ';
  filterHtml += '<button id="exportTxt">Export TXT</button>';

  document.getElementById("output").innerHTML = filterHtml;

  document.getElementById("applyFilters").addEventListener("click", function () {
    const selectedProto = document.getElementById("protocolFilter").value;
    const ipQuery = document.getElementById("ipSearch").value.trim();
    const startTime = parseFloat(document.getElementById("startTime").value.trim());
    const endTime = parseFloat(document.getElementById("endTime").value.trim());

    const filtered = globalData.rows.filter(row => {
      const time = parseFloat(row[globalData.indices.timeIndex]);
      const protoMatch = selectedProto === "all" || row[globalData.indices.protoIndex]?.trim() === selectedProto;
      const ipMatch = !ipQuery || row[globalData.indices.srcIndex]?.includes(ipQuery) || row[globalData.indices.dstIndex]?.includes(ipQuery);
      const timeMatch = (!isNaN(startTime) ? time >= startTime : true) && (!isNaN(endTime) ? time <= endTime : true);
      return protoMatch && ipMatch && timeMatch;
    });

    renderAll(filtered);
  });

  document.getElementById("exportTxt").addEventListener("click", function () {
    const { timeIndex, srcIndex, protoIndex, dstIndex } = globalData.indices;
    let txt = "Time\tSource\tProtocol\tDestination\n";
    globalData.rows.forEach(row => {
      const time = row[timeIndex]?.trim();
      const source = row[srcIndex]?.trim();
      const protocol = row[protoIndex]?.trim();
      const destination = row[dstIndex]?.trim();
      if (time && source && protocol && destination) {
        txt += `${time}\t${source}\t${protocol}\t${destination}\n`;
      }
    });
    const blob = new Blob([txt], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "filtered_output.txt";
    link.click();
  });
}

function renderAll(rows) {
  const { timeIndex, srcIndex, protoIndex, dstIndex } = globalData.indices;

  let html = "<h2>Packet Table</h2><table><thead><tr><th>Time</th><th>Source</th><th>Protocol</th><th>Destination</th></tr></thead><tbody>";

  const srcCount = {};
  const dstCount = {};
  const protoCount = {};

  for (const row of rows) {
    if (row.length < Math.max(timeIndex, srcIndex, protoIndex, dstIndex)) continue;
    const time = row[timeIndex]?.trim();
    const source = row[srcIndex]?.trim();
    const protocol = row[protoIndex]?.trim();
    const destination = row[dstIndex]?.trim();
    if (time && source && protocol && destination) {
      html += `<tr><td>${time}</td><td>${source}</td><td>${protocol}</td><td>${destination}</td></tr>`;
      srcCount[source] = (srcCount[source] || 0) + 1;
      dstCount[destination] = (dstCount[destination] || 0) + 1;
      protoCount[protocol] = (protoCount[protocol] || 0) + 1;
    }
  }

  html += "</tbody></table>";

  function buildTopList(title, dataObj, canvasId) {
    const entries = Object.entries(dataObj).sort((a, b) => b[1] - a[1]).slice(0, 10);
    let listHtml = `<h3>${title}</h3><table><thead><tr><th>Value</th><th>Count</th></tr></thead><tbody>`;
    const labels = [], values = [];
    for (const [key, count] of entries) {
      listHtml += `<tr><td>${key}</td><td>${count}</td></tr>`;
      labels.push(key);
      values.push(count);
    }
    listHtml += `</tbody></table><canvas id="${canvasId}" height="200"></canvas>`;
    setTimeout(() => renderChart(canvasId, labels, values, title), 0);
    return listHtml;
  }

  function renderChart(canvasId, labels, values, title) {
    const ctx = document.getElementById(canvasId).getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: title,
          data: values,
          backgroundColor: "#4e79a7"
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, title: { display: true, text: title } }
      }
    });
  }

  html += buildTopList("Top 10 Source IPs", srcCount, "srcChart");
  html += buildTopList("Top 10 Destination IPs", dstCount, "dstChart");
  html += buildTopList("Top 10 Protocols", protoCount, "protoChart");

  document.getElementById("output").innerHTML += html;
}
