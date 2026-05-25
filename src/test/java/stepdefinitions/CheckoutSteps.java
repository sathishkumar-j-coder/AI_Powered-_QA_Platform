package stepdefinitions;

import base.DriverFactory;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import org.openqa.selenium.WebDriver;
import org.testng.Assert;
import pages.*;
import utils.CsvReaderUtil;
import utils.ExtentReportManager;

import java.util.Map;

public class CheckoutSteps {
    private WebDriver driver = DriverFactory.getDriver();
    private InventoryPage inventoryPage = new InventoryPage(driver);
    private CartPage cartPage = new CartPage(driver);
    private CheckoutPage checkoutPage = new CheckoutPage(driver);
    private OverviewPage overviewPage = new OverviewPage(driver);
    private ConfirmationPage confirmationPage = new ConfirmationPage(driver);
    private String checkoutDataPath = "src/test/resources/testdata/checkoutData.csv";

    @Given("I add {string} to the cart")
    public void i_add_to_the_cart(String productName) {
        ExtentReportManager.getTest().info("Adding product to cart: " + productName);
        inventoryPage.addProductToCart(productName);
    }

    @Given("I navigate to the Cart page")
    public void i_navigate_to_the_cart_page() {
        ExtentReportManager.getTest().info("Navigating to Cart page");
        inventoryPage.clickCartIcon();
        Assert.assertTrue(cartPage.isPageLoaded(), "Cart page failed to load!");
    }

    @Given("I click checkout button")
    public void i_click_checkout_button() {
        ExtentReportManager.getTest().info("Clicking Checkout button");
        cartPage.clickCheckout();
    }

    @When("I fill checkout billing details for scenario {string}")
    public void i_fill_checkout_billing_details_for_scenario(String scenarioId) {
        Map<String, String> data = CsvReaderUtil.getTestDataByScenario(checkoutDataPath, "scenarioId", scenarioId);
        String firstName = data.get("firstName");
        String lastName = data.get("lastName");
        String postalCode = data.get("postalCode");
        
        ExtentReportManager.getTest().info("Entering details: FirstName='" + firstName + "', LastName='" + lastName + "', PostalCode='" + postalCode + "'");
        checkoutPage.fillCheckoutDetails(firstName, lastName, postalCode);
    }

    @When("I click continue checkout")
    public void i_click_continue_checkout() {
        ExtentReportManager.getTest().info("Clicking Continue button");
        checkoutPage.clickContinue();
    }

    @Then("I should be navigated to Overview page")
    public void i_should_be_navigated_to_overview_page() {
        Assert.assertTrue(overviewPage.isPageLoaded(), "Overview page failed to load!");
        ExtentReportManager.getTest().pass("Successfully navigated to Overview page.");
    }

    @Then("I click finish order button")
    public void i_click_finish_order_button() {
        ExtentReportManager.getTest().info("Clicking Finish order button");
        overviewPage.clickFinish();
    }

    @Then("I should see the order completion message {string}")
    public void i_should_see_the_order_completion_message(String expectedMessage) {
        String actualMessage = confirmationPage.getConfirmationHeader();
        ExtentReportManager.getTest().info("Verifying order confirmation message. Expected: '" + expectedMessage + "', Actual: '" + actualMessage + "'");
        Assert.assertTrue(actualMessage.equalsIgnoreCase(expectedMessage), "Order confirmation mismatch!");
    }

    @Then("I should see the checkout error message {string}")
    public void i_should_see_the_checkout_error_message(String expectedMessage) {
        String actualMessage = checkoutPage.getErrorMessage();
        ExtentReportManager.getTest().info("Verifying checkout error. Expected: '" + expectedMessage + "', Actual: '" + actualMessage + "'");
        Assert.assertTrue(actualMessage.contains(expectedMessage), "Checkout error message mismatch!");
    }
}
