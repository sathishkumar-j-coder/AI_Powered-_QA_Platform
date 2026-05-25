package base;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.edge.EdgeDriver;
import org.openqa.selenium.edge.EdgeOptions;
import utils.ConfigReader;

import java.time.Duration;

public class DriverFactory {
    private static ThreadLocal<WebDriver> tlDriver = new ThreadLocal<>();

    /**
     * Initializes and returns the WebDriver for the current thread.
     */
    public static WebDriver initDriver(String browser) {
        System.out.println("[INFO] Initializing driver: " + browser);
        boolean isHeadless = Boolean.parseBoolean(ConfigReader.getProperty("headless"));

        if (browser.equalsIgnoreCase("chrome")) {
            WebDriverManager.chromedriver().setup();
            ChromeOptions options = new ChromeOptions();
            if (isHeadless) {
                options.addArguments("--headless=new");
                options.addArguments("--disable-gpu");
                options.addArguments("--no-sandbox");
                options.addArguments("--disable-dev-shm-usage");
                options.addArguments("--window-size=1920,1080");
            }
            tlDriver.set(new ChromeDriver(options));
        } else if (browser.equalsIgnoreCase("edge")) {
            WebDriverManager.edgedriver().setup();
            EdgeOptions options = new EdgeOptions();
            if (isHeadless) {
                options.addArguments("--headless");
                options.addArguments("--disable-gpu");
                options.addArguments("--window-size=1920,1080");
            }
            tlDriver.set(new EdgeDriver(options));
        } else {
            throw new RuntimeException("Unsupported browser type: " + browser);
        }

        WebDriver driver = getDriver();
        driver.manage().deleteAllCookies();
        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(ConfigReader.getTimeout()));
        driver.manage().window().maximize();
        return driver;
    }

    /**
     * Returns the thread-local WebDriver instance.
     */
    public static synchronized WebDriver getDriver() {
        return tlDriver.get();
    }

    /**
     * Quits the driver and cleans up the thread-local instance.
     */
    public static void quitDriver() {
        if (getDriver() != null) {
            System.out.println("[INFO] Quitting driver instance.");
            getDriver().quit();
            tlDriver.remove();
        }
    }
}
