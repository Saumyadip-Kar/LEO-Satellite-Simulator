// // Function to download the CSV file
// export function downloadCSV(csv, filename) {
//     let csvFile;
//     let downloadLink;

//     // CSV file
//     csvFile = new Blob([csv], {type: "text/csv"});

//     // Download link
//     downloadLink = document.createElement("a");

//     // File name
//     downloadLink.download = filename;

//     // Create a link to the file
//     downloadLink.href = window.URL.createObjectURL(csvFile);

//     // Hide download link
//     downloadLink.style.display = "none";

//     // Add the link to DOM
//     document.body.appendChild(downloadLink);

//     // Click download link
//     downloadLink.click();
// }

// // Function to export the specific table to a CSV file
// export function exportTableToCSV(table, filename) {
//     let csv = [];
//     let rows = table.querySelectorAll('tr');

//     for (let i = 0; i < rows.length; i++) {
//         let row = [], cols = rows[i].querySelectorAll("td, th");

//         for (let j = 0; j < cols.length; j++) {
//             row.push(cols[j].innerText);
//         }

//         csv.push(row.join(","));
//     }

//     // Download CSV file
//     downloadCSV(csv.join("\n"), filename);
// }



// // Function to download the HTML file
// export function downloadHTML(html, filename) {
//     const htmlFile = new Blob([html], { type: "text/html;charset=utf-8;" });
//     const downloadLink = document.createElement("a");
//     const url = URL.createObjectURL(htmlFile);
    
//     downloadLink.href = url;
//     downloadLink.download = filename;
//     downloadLink.style.display = "none";

//     // Append link to the DOM and trigger a click to start the download
//     document.body.appendChild(downloadLink);
//     downloadLink.click();

//     // Clean up
//     document.body.removeChild(downloadLink);
//     URL.revokeObjectURL(url);
// }

// // Function to export all tables to a single HTML file
// export function exportTablesToHTML(tables, filename) {
//     let htmlContent = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Exported Tables</title></head><body>';
    
//     tables.forEach(table => {
//         htmlContent += table.outerHTML + '<br>';
//     });
    
//     htmlContent += '</body></html>';

//     // Download the HTML file
//     downloadHTML(htmlContent, filename);
// }



// Function to convert a table element to CSV
export function tableToCSV(table) {
    const rows = table.querySelectorAll('tr');
    const csv = Array.from(rows).map(row => {
        const cells = row.querySelectorAll('td, th');
        return Array.from(cells).map(cell => `"${cell.innerText.replace(/"/g, '""')}"`).join(',');
    }).join('\n');
    return csv;
}

// Function to export multiple tables to a single CSV file
export function exportTablesToCSV(tables, filename) {
    const csvParts = [];

    tables.forEach((table, index) => {
        // Convert each table to CSV and add it to the parts array
        const tableCSV = tableToCSV(table);
        csvParts.push(tableCSV);
        // Add a blank line between tables
        if (index < tables.length - 1) {
            csvParts.push('');
        }
    });

    // Combine all parts into a single CSV string
    const combinedCSV = csvParts.join('\n');

    // Trigger the download
    downloadCSV(combinedCSV, filename);
}

// Function to trigger download of a CSV file
export function downloadCSV(csv, filename) {
    const csvFile = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const downloadLink = document.createElement('a');
    const url = URL.createObjectURL(csvFile);
    
    downloadLink.href = url;
    downloadLink.download = filename;
    downloadLink.style.display = 'none';

    // Append link to the DOM and trigger a click to start the download
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // Clean up
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
}
