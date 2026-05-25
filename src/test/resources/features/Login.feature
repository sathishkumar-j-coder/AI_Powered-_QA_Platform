@login
Feature: Login Module

  @smoke @sanity @regression
  Scenario: Valid Login
    Given I navigate to SauceDemo website
    When I perform login for scenario "valid_login"
    Then I should be navigated to the inventory page

  @regression
  Scenario: Invalid Login
    Given I navigate to SauceDemo website
    When I perform login for scenario "invalid_login"
    Then I should see the login error message for scenario "invalid_login"

  @regression
  Scenario: Empty Username Validation
    Given I navigate to SauceDemo website
    When I perform login for scenario "empty_username"
    Then I should see the login error message for scenario "empty_username"

  @regression
  Scenario: Empty Password Validation
    Given I navigate to SauceDemo website
    When I perform login for scenario "empty_password"
    Then I should see the login error message for scenario "empty_password"

  @sanity @regression
  Scenario: Locked Out User Validation
    Given I navigate to SauceDemo website
    When I perform login for scenario "locked_out_user"
    Then I should see the login error message for scenario "locked_out_user"
