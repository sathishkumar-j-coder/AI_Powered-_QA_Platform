package stepdefinitions;

import base.DriverFactory;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import org.openqa.selenium.WebDriver;
import org.testng.Assert;
import pages.InventoryPage;
import utils.CsvReaderUtil;
import utils.ExtentReportManager;

import java.util.List;
import java.util.Map;

public class ProductSteps {
    private WebDriver driver = DriverFactory.getDriver();
    private InventoryPage inventoryPage = new InventoryPage(driver);
    private String productDataPath = "src/test/resources/testdata/productData.csv";

    @When("I add product for scenario {string} to cart")
    public void i_add_product_for_scenario_to_cart(String scenarioId) {
        Map<String, String> data = CsvReaderUtil.getTestDataByScenario(productDataPath, "scenarioId", scenarioId);
        String productName = data.get("productName");
        ExtentReportManager.getTest().info("Adding product to cart: " + productName);
        inventoryPage.addProductToCart(productName);
    }

    @Then("the cart badge count should be {int}")
    public void the_cart_badge_count_should_be(int expectedCount) {
        int actualCount = inventoryPage.getCartCount();
        ExtentReportManager.getTest().info("Verifying cart badge count. Expected: " + expectedCount + ", Actual: " + actualCount);
        Assert.assertEquals(actualCount, expectedCount, "Cart count mismatch!");
    }

    @When("I remove product for scenario {string} from cart")
    public void i_remove_product_for_scenario_from_cart(String scenarioId) {
        Map<String, String> data = CsvReaderUtil.getTestDataByScenario(productDataPath, "scenarioId", scenarioId);
        String productName = data.get("productName");
        ExtentReportManager.getTest().info("Removing product from cart: " + productName);
        inventoryPage.removeProductFromCart(productName);
    }

    @Then("the cart badge should not be displayed")
    public void the_cart_badge_should_not_be_displayed() {
        boolean displayed = inventoryPage.isCartBadgeDisplayed();
        ExtentReportManager.getTest().info("Verifying cart badge is not displayed. Actual: " + displayed);
        Assert.assertFalse(displayed, "Cart badge is still displayed!");
    }

    @When("I sort products by option for scenario {string}")
    public void i_sort_products_by_option_for_scenario(String scenarioId) {
        Map<String, String> data = CsvReaderUtil.getTestDataByScenario(productDataPath, "scenarioId", scenarioId);
        String sortOption = data.get("sortOption");
        ExtentReportManager.getTest().info("Sorting products by: " + sortOption);
        inventoryPage.selectSortOption(sortOption);
    }

    @Then("the first product name should match the expected for scenario {string}")
    public void the_first_product_name_should_match_the_expected_for_scenario(String scenarioId) {
        Map<String, String> data = CsvReaderUtil.getTestDataByScenario(productDataPath, "scenarioId", scenarioId);
        String expectedFirst = data.get("expectedFirstProduct");
        List<String> productNames = inventoryPage.getProductNames();
        String actualFirst = productNames.get(0);
        ExtentReportManager.getTest().info("Verifying first sorted product. Expected: '" + expectedFirst + "', Actual: '" + actualFirst + "'");
        Assert.assertEquals(actualFirst, expectedFirst, "Sorted product order mismatch!");
    }
}
