package utils;

import com.aventstack.extentreports.ExtentReports;
import com.aventstack.extentreports.ExtentTest;
import com.aventstack.extentreports.reporter.ExtentSparkReporter;
import com.aventstack.extentreports.reporter.configuration.Theme;

import java.io.File;

public class ExtentReportManager {
    private static ExtentReports extent;
    private static ThreadLocal<ExtentTest> test = new ThreadLocal<>();

    public static synchronized ExtentReports getReporter() {
        if (extent == null) {
            String reportPath = ConfigReader.getProperty("report.path");
            System.out.println("[INFO] Initializing Extent Reports at: " + reportPath);
            File reportFile = new File(reportPath);
            if (!reportFile.getParentFile().exists()) {
                reportFile.getParentFile().mkdirs();
            }
            ExtentSparkReporter spark = new ExtentSparkReporter(reportPath);
            spark.config().setTheme(Theme.DARK);
            spark.config().setDocumentTitle("SauceDemo Automation Execution Report");
            spark.config().setReportName("SauceDemo QA Test Execution Summary");

            extent = new ExtentReports();
            extent.attachReporter(spark);
            extent.setSystemInfo("QA Engineer", "Automation Architect");
            extent.setSystemInfo("Application", "SauceDemo");
            extent.setSystemInfo("OS", System.getProperty("os.name"));
            extent.setSystemInfo("Java Version", System.getProperty("java.version"));
        }
        return extent;
    }

    public static synchronized ExtentTest getTest() {
        return test.get();
    }

    public static synchronized void setTest(ExtentTest extentTest) {
        test.set(extentTest);
    }

    public static synchronized ExtentTest createTest(String testName) {
        ExtentTest t = getReporter().createTest(testName);
        setTest(t);
        return t;
    }

    public static synchronized void flush() {
        if (extent != null) {
            extent.flush();
        }
    }
}
