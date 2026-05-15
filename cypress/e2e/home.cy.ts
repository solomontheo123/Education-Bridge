describe("Home page", () => {
  it("loads and shows the landing content", () => {
    cy.visit("/");
    cy.contains("Education Bridge").should("exist");
  });
});
