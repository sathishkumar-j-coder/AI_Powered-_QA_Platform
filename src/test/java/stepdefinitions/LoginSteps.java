package stepdefinitions;

import base.DriverFactory;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import org.openqa.selenium.WebDriver;
import org.testng.Assert;
import pages.InventoryPage;
import pages.LoginPage;
import utils.ConfigReader;
import utils.CsvReaderUtil;
import utils.ExtentReportManager;

import java.util.Map;

public class LoginSteps {
    private WebDriver driver = DriverFactory.getDriver();
    private LoginPage loginPage = new LoginPage(driver);
    private InventoryPage inventoryPage = new InventoryPage(driver);
    private String loginDataPath = "src/test/resources/testdata/loginData.csv";

    @Given("I navigate to SauceDemo website")
    public void i_navigate_to_saucedemo_website() {
        String url = ConfigReader.getProperty("url");
        ExtentReportManager.getTest().info("Navigating to URL: " + url);
        driver.get(url);
    }

    @When("I perform login for scenario {string}")
    public void i_perform_login_for_scenario(String scenarioId) {
        Map<String, String> data = CsvReaderUtil.getTestDataByScenario(loginDataPath, "scenarioId", scenarioId);
        String username = data.get("username");
        String password = data.get("password");
        ExtentReportManager.getTest().info("Logging in with Username: '" + username + "'");
        loginPage.login(username, password);
    }

    @Then("I should be navigated to the inventory page")
    public void i_should_be_navigated_to_the_inventory_page() {
        Assert.assertTrue(inventoryPage.isPageLoaded(), "Inventory page failed to load!");
        ExtentReportManager.getTest().pass("Successfully navigated to Inventory page.");
    }

    @Then("I should see the login error message for scenario {string}")
    public void i_should_see_the_login_error_message_for_scenario(String scenarioId) {
        Map<String, String> data = CsvReaderUtil.getTestDataByScenario(loginDataPath, "scenarioId", scenarioId);
        String expectedError = data.get("expectedError");
        String actualError = loginPage.getErrorMessage();
        ExtentReportManager.getTest().info("Asserting Error: Expected='" + expectedError + "', Actual='" + actualError + "'");
        Assert.assertTrue(actualError.contains(expectedError), "Error message mismatch! Expected: '" + expectedError + "' but got: '" + actualError + "'");
    }

    @Given("I log in as standard user")
    public void i_log_in_as_standard_user() {
        i_navigate_to_saucedemo_website();
        ExtentReportManager.getTest().info("Performing background Standard User login");
        loginPage.login("standard_user", "secret_sauce");
    }
}
