package pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.Select;
import org.openqa.selenium.support.ui.WebDriverWait;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

public class InventoryPage {
    private WebDriver driver;
    private WebDriverWait wait;

    // Locators
    private By titleLabel = By.className("title");
    private By productSortDropdown = By.className("product_sort_container");
    private By cartBadge = By.className("shopping_cart_badge");
    private By cartLink = By.className("shopping_cart_link");
    private By productItemNames = By.className("inventory_item_name");
    private By productItemPrices = By.className("inventory_item_price");

    // Constructor
    public InventoryPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    // Actions
    public boolean isPageLoaded() {
        WebElement title = wait.until(ExpectedConditions.visibilityOfElementLocated(titleLabel));
        return title.getText().equalsIgnoreCase("Products");
    }

    public void addProductToCart(String productName) {
        By addToCartBtn = By.xpath("//div[text()='" + productName + "']/ancestor::div[@class='inventory_item']//button[contains(@id,'add-to-cart')]");
        wait.until(ExpectedConditions.elementToBeClickable(addToCartBtn)).click();
    }

    public void removeProductFromCart(String productName) {
        By removeBtn = By.xpath("//div[text()='" + productName + "']/ancestor::div[@class='inventory_item']//button[contains(@id,'remove')]");
        wait.until(ExpectedConditions.elementToBeClickable(removeBtn)).click();
    }

    public int getCartCount() {
        try {
            WebElement badge = wait.until(ExpectedConditions.visibilityOfElementLocated(cartBadge));
            return Integer.parseInt(badge.getText());
        } catch (Exception e) {
            return 0; // If badge is not present, cart is empty
        }
    }

    public boolean isCartBadgeDisplayed() {
        try {
            return driver.findElement(cartBadge).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public void clickCartIcon() {
        wait.until(ExpectedConditions.elementToBeClickable(cartLink)).click();
    }

    public void selectSortOption(String sortText) {
        WebElement dropdown = wait.until(ExpectedConditions.elementToBeClickable(productSortDropdown));
        Select select = new Select(dropdown);
        select.selectByVisibleText(sortText);
    }

    public List<String> getProductNames() {
        List<WebElement> elements = wait.until(ExpectedConditions.visibilityOfAllElementsLocatedBy(productItemNames));
        List<String> names = new ArrayList<>();
        for (WebElement el : elements) {
            names.add(el.getText());
        }
        return names;
    }

    public List<Double> getProductPrices() {
        List<WebElement> elements = wait.until(ExpectedConditions.visibilityOfAllElementsLocatedBy(productItemPrices));
        List<Double> prices = new ArrayList<>();
        for (WebElement el : elements) {
            String priceText = el.getText().replace("$", "").trim();
            prices.add(Double.parseDouble(priceText));
        }
        return prices;
    }
}
