package utils;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;

import java.io.FileReader;
import java.io.IOException;
import java.io.Reader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class CsvReaderUtil {

    /**
     * Reads a CSV file and returns its content as a List of Maps.
     * Each Map represents a row, with column names as keys and cell contents as values.
     */
    public static List<Map<String, String>> readCsvData(String filePath) {
        List<Map<String, String>> data = new ArrayList<>();
        try (Reader reader = new FileReader(filePath);
             CSVParser csvParser = new CSVParser(reader, CSVFormat.DEFAULT
                     .withFirstRecordAsHeader()
                     .withIgnoreHeaderCase()
                     .withTrim())) {

            List<String> headers = csvParser.getHeaderNames();
            for (CSVRecord record : csvParser) {
                Map<String, String> row = new HashMap<>();
                for (String header : headers) {
                    row.put(header, record.get(header));
                }
                data.add(row);
            }
        } catch (IOException e) {
            System.err.println("[ERROR] Failed to read CSV file: " + filePath);
            e.printStackTrace();
        }
        return data;
    }

    /**
     * Helper to find a specific row of test data matching a unique key (e.g. Scenario ID or Name).
     */
    public static Map<String, String> getTestDataByScenario(String filePath, String keyColumn, String keyValue) {
        List<Map<String, String>> allData = readCsvData(filePath);
        for (Map<String, String> row : allData) {
            if (row.containsKey(keyColumn) && row.get(keyColumn).equalsIgnoreCase(keyValue)) {
                return row;
            }
        }
        throw new RuntimeException("Test data not found for " + keyColumn + " = " + keyValue + " in file: " + filePath);
    }
}
