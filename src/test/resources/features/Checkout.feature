@checkout
Feature: Checkout Module

  Background:
    Given I navigate to SauceDemo website
    And I log in as standard user
    And I add "Sauce Labs Backpack" to the cart
    And I navigate to the Cart page
    And I click checkout button

  @smoke @sanity @regression
  Scenario: Valid Complete Checkout Flow
    When I fill checkout billing details for scenario "valid_checkout"
    And I click continue checkout
    Then I should be navigated to Overview page
    And I click finish order button
    Then I should see the order completion message "Thank you for your order!"

  @regression
  Scenario: Empty First Name Checkout Validation
    When I fill checkout billing details for scenario "empty_firstname"
    And I click continue checkout
    Then I should see the checkout error message "Error: First Name is required"

  @regression
  Scenario: Empty Last Name Checkout Validation
    When I fill checkout billing details for scenario "empty_lastname"
    And I click continue checkout
    Then I should see the checkout error message "Error: Last Name is required"

  @regression
  Scenario: Empty Postal Code Checkout Validation
    When I fill checkout billing details for scenario "empty_postalcode"
    And I click continue checkout
    Then I should see the checkout error message "Error: Postal Code is required"
