package pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import java.time.Duration;

public class ConfirmationPage {
    private WebDriver driver;
    private WebDriverWait wait;

    // Locators
    private By completeHeader = By.className("complete-header");
    private By completeText = By.className("complete-text");
    private By backToProductsButton = By.id("back-to-products");

    // Constructor
    public ConfirmationPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    // Actions
    public String getConfirmationHeader() {
        WebElement element = wait.until(ExpectedConditions.visibilityOfElementLocated(completeHeader));
        return element.getText();
    }

    public String getConfirmationText() {
        WebElement element = wait.until(ExpectedConditions.visibilityOfElementLocated(completeText));
        return element.getText();
    }

    public void clickBackToProducts() {
        wait.until(ExpectedConditions.elementToBeClickable(backToProductsButton)).click();
    }
}
