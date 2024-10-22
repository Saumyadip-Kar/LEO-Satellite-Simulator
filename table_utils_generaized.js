// Function to convert a table element to CSV
function tableToCSV(table) {
    const rows = table.querySelectorAll('tr');
    const csv = Array.from(rows).map(row => {
        const cells = row.querySelectorAll('td, th');
        return Array.from(cells).map(cell => `"${cell.innerText.replace(/"/g, '""')}"`).join(',');
    }).join('\n');
    return csv;
}

// Function to export multiple tables to a single CSV file
function exportTablesToCSV(tables, filename) {
    const csvParts = [];

    tables.forEach((table, index) => {
        // Convert each table to CSV and add it to the parts array
        const tableCSV = tableToCSV(table);
        console.log(table);
        let table_name = table.getAttribute('name');
        if(table_name==null) table_name = "Sample Table"
        csvParts.push(table_name+":");
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
function downloadCSV(csv, filename) {
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







// Function to convert a table to a SheetJS worksheet
function tableToSheet(table) {
    const sheet = XLSX.utils.table_to_sheet(table); // Convert table to a worksheet
    return sheet;
}

// Function to export multiple tables to an Excel file
function exportTablesToExcel(tables, filename) {
    // Create a new workbook
    const wb = XLSX.utils.book_new();

    tables.forEach((table, index) => {
        // Get table name or default to "Sample Table"
        let table_name = table.getAttribute('name');
        if (table_name == null) table_name = "Sample Table " + (index + 1);

        // Convert the table to a worksheet
        const sheet = tableToSheet(table);

        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(wb, sheet, table_name);
    });

    // Write the workbook to an Excel file
    XLSX.writeFile(wb, filename);
}






//Functionality to export all the tables in a page in csv file
//The export button in that page must have the id = "exporter_csv"
const exporter_csv = document.getElementById("exporter_csv");
exporter_csv.onclick = function(){
    let tables = document.querySelectorAll('table');
    exportTablesToCSV(tables,"Experiments_Results.csv");
};


//Functionality to export all the tables in a page in xls file
//The export button in that page must have the id = "exporter_xls"
const exporter_xls = document.getElementById("exporter_xls");
exporter_xls.onclick = function(){
    let tables = document.querySelectorAll('table');
    exportTablesToExcel(tables,"Experiments_Results.xls");
};