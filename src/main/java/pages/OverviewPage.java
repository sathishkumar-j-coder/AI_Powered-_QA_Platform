package pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import java.time.Duration;

public class OverviewPage {
    private WebDriver driver;
    private WebDriverWait wait;

    // Locators
    private By finishButton = By.id("finish");
    private By titleLabel = By.className("title");
    private By summarySubtotal = By.className("summary_subtotal_label");
    private By summaryTax = By.className("summary_tax_label");
    private By summaryTotal = By.className("summary_total_label");

    // Constructor
    public OverviewPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    // Actions
    public boolean isPageLoaded() {
        WebElement title = wait.until(ExpectedConditions.visibilityOfElementLocated(titleLabel));
        return title.getText().equalsIgnoreCase("Checkout: Overview");
    }

    public String getSubtotalText() {
        return wait.until(ExpectedConditions.visibilityOfElementLocated(summarySubtotal)).getText();
    }

    public String getTotalText() {
        return wait.until(ExpectedConditions.visibilityOfElementLocated(summaryTotal)).getText();
    }

    public void clickFinish() {
        wait.until(ExpectedConditions.elementToBeClickable(finishButton)).click();
    }
}
