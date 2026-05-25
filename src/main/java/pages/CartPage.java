package pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import java.time.Duration;

public class CartPage {
    private WebDriver driver;
    private WebDriverWait wait;

    // Locators
    private By checkoutButton = By.id("checkout");
    private By titleLabel = By.className("title");

    // Constructor
    public CartPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    // Actions
    public boolean isPageLoaded() {
        WebElement title = wait.until(ExpectedConditions.visibilityOfElementLocated(titleLabel));
        return title.getText().equalsIgnoreCase("Your Cart");
    }

    public boolean isItemInCart(String itemName) {
        By itemLocator = By.xpath("//div[@class='inventory_item_name' and text()='" + itemName + "']");
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(itemLocator)).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    public void clickCheckout() {
        wait.until(ExpectedConditions.elementToBeClickable(checkoutButton)).click();
    }
}
