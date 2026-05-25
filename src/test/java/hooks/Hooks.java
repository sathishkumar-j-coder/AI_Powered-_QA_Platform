package hooks;

import base.DriverFactory;
import io.cucumber.java.After;
import io.cucumber.java.Before;
import io.cucumber.java.Scenario;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import utils.ConfigReader;
import utils.ExtentReportManager;
import com.aventstack.extentreports.ExtentTest;
import com.aventstack.extentreports.MediaEntityBuilder;

public class Hooks {
    private WebDriver driver;

    @Before
    public void setUp(Scenario scenario) {
        System.out.println("[HOOK] Executing Scenario: " + scenario.getName());
        String browser = ConfigReader.getProperty("browser");
        driver = DriverFactory.initDriver(browser);

        // Initialize Extent Test for this scenario
        ExtentTest test = ExtentReportManager.createTest(scenario.getName());
        test.assignCategory(scenario.getSourceTagNames().toArray(new String[0]));
        test.info("Scenario started: " + scenario.getName());
    }

    @After
    public void tearDown(Scenario scenario) {
        System.out.println("[HOOK] Finished Scenario: " + scenario.getName() + " | Status: " + scenario.getStatus());
        ExtentTest test = ExtentReportManager.getTest();

        if (scenario.isFailed()) {
            try {
                // Capture Screenshot on Failure
                String screenshotBase64 = ((TakesScreenshot) driver).getScreenshotAs(OutputType.BASE64);
                scenario.attach(((TakesScreenshot) driver).getScreenshotAs(OutputType.BYTES), "image/png", "Failed_Step_Screenshot");
                test.fail("Scenario Failed: " + scenario.getName(), 
                        MediaEntityBuilder.createScreenCaptureFromBase64String(screenshotBase64).build());
            } catch (Exception e) {
                test.fail("Scenario Failed, but could not capture screenshot: " + e.getMessage());
            }
        } else {
            test.pass("Scenario Passed successfully.");
        }

        // Teardown WebDriver and flush report
        DriverFactory.quitDriver();
        ExtentReportManager.flush();
    }
}
