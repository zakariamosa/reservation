/*
 * script.js
 *
 * This file contains all of the behaviour for the main reservation ordering page.
 * It loads menu items from a local text file and allows users to create an
 * order by selecting items. Orders can be saved to localStorage so that
 * the kitchen display (display.html) can read them. Users can also add
 * new items at runtime, which persist across sessions using localStorage.
 */

(function () {
  // Global arrays for menu items and orders
  let items = [];
  let customItems = [];
  let currentOrder = null;
  let orders = [];

  /**
   * Parse a single line from the listofitems.txt file.
   * The format supports either "category|item", "category,item", "category-item" or
   * "category;item". If no separator is found then the category is set to
   * "uncategorized".
   * Lines beginning with '#' are treated as comments and ignored.
   *
   * @param {string} line
   * @returns {{category: string, name: string}|null}
   */
  function parseLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return null;
    }
    // Split on comma, pipe, semicolon or dash. Use regex character class
    const parts = trimmed.split(/[|,;\-]+/);
    let category = parts[0].trim();
    let name;
    if (parts.length > 1) {
      name = parts.slice(1).join(" ").trim();
      // If item name empty, fall back to using the same as category
      if (!name) {
        name = category;
        category = "uncategorized";
      }
    } else {
      // No separator found; treat entire line as the item name and
      // assign a generic category
      category = "uncategorized";
      name = trimmed;
    }
    return { category, name };
  }

  /**
   * Load items from the listofitems.txt file and merge with custom items stored
   * in localStorage. Returns a promise that resolves once loading is
   * complete.
   */
  async function loadItems() {
    try {
      const response = await fetch("listofitems.txt");
      // When running via file:// protocol, fetch may fail because of CORS.
      // If that happens we fall back to a predefined list later.
      const text = await response.text();
      const lines = text.split(/\r?\n/);
      const parsed = lines
        .map((line) => parseLine(line))
        .filter((itm) => itm !== null);
      items = parsed;
    } catch (err) {
      console.warn(
        "Could not fetch listofitems.txt. Falling back to sample items.",
        err
      );
      items = [];
    }
    // Load any custom items that have been added by the user previously
    const storedCustom = localStorage.getItem("customItems");
    if (storedCustom) {
      try {
        customItems = JSON.parse(storedCustom);
      } catch (e) {
        customItems = [];
      }
    } else {
      customItems = [];
    }
    items = items.concat(customItems);
    // If after loading we still have no items (for example if fetch failed)
    // provide a default set of sample items so the interface is usable.
    if (items.length === 0) {
      items = [
        { category: "dishes", name: "Falafel Dish" },
        { category: "dishes", name: "Nacho" },
        { category: "dishes", name: "Burger" },
        { category: "wraps", name: "Chicken Wrap" },
        { category: "wraps", name: "Falafel Wrap" },
        { category: "drinks", name: "Lemonade" },
        { category: "drinks", name: "Water" },
        { category: "drinks", name: "Soda" },
      ];
    }
  }

  /**
   * Group items by category. Returns an object where each key is a
   * category and the value is an array of item names.
   *
   * @param {Array<{category:string,name:string}>} list
   */
  function groupByCategory(list) {
    const groups = {};
    list.forEach((itm) => {
      const cat = itm.category || "uncategorized";
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(itm.name);
    });
    return groups;
  }

  /**
   * Render the menu buttons into the DOM. This reads from the global
   * `items` array and groups them by category. Each category gets its own
   * container with its items as buttons.
   */
  function renderMenu() {
    const container = document.getElementById("menu-buttons");
    container.innerHTML = "";
    const grouped = groupByCategory(items);
    Object.keys(grouped).forEach((category) => {
      const catDiv = document.createElement("div");
      catDiv.className = "category";
      const title = document.createElement("h3");
      // Capitalize the category for display
      title.textContent = category
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      catDiv.appendChild(title);
      const btnContainer = document.createElement("div");
      btnContainer.className = "category-buttons";
      grouped[category].forEach((itemName) => {
        const btn = document.createElement("button");
        btn.textContent = itemName;
        btn.dataset.name = itemName;
        btn.dataset.category = category;
        btn.addEventListener("click", () => {
          addItemToOrder(itemName, category);
        });
        btnContainer.appendChild(btn);
      });
      catDiv.appendChild(btnContainer);
      container.appendChild(catDiv);
    });
  }

  /**
   * Render the current order summary. Shows a table with items,
   * quantities and action buttons to modify the order.
   */
  function renderOrder() {
    const summaryDiv = document.getElementById("order-summary");
    summaryDiv.innerHTML = "";
    if (!currentOrder || !currentOrder.items || Object.keys(currentOrder.items).length === 0) {
      summaryDiv.textContent = "No items in this order.";
      return;
    }
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    ["Item", "Category", "Qty", "Actions"].forEach((header) => {
      const th = document.createElement("th");
      th.textContent = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    Object.keys(currentOrder.items).forEach((name) => {
      const itm = currentOrder.items[name];
      const tr = document.createElement("tr");
      // Item name
      const tdName = document.createElement("td");
      tdName.textContent = name;
      tr.appendChild(tdName);
      // Category
      const tdCat = document.createElement("td");
      tdCat.textContent = itm.category;
      tr.appendChild(tdCat);
      // Quantity
      const tdQty = document.createElement("td");
      tdQty.textContent = itm.quantity;
      tr.appendChild(tdQty);
      // Actions
      const tdAct = document.createElement("td");
      // Decrease button
      const decBtn = document.createElement("button");
      decBtn.className = "decrease";
      decBtn.textContent = "-";
      decBtn.addEventListener("click", () => {
        updateItemQuantity(name, -1);
      });
      tdAct.appendChild(decBtn);
      // Increase button
      const incBtn = document.createElement("button");
      incBtn.className = "increase";
      incBtn.textContent = "+";
      incBtn.addEventListener("click", () => {
        updateItemQuantity(name, 1);
      });
      tdAct.appendChild(incBtn);
      // Remove button
      const remBtn = document.createElement("button");
      remBtn.className = "remove";
      remBtn.textContent = "Remove";
      remBtn.addEventListener("click", () => {
        removeItem(name);
      });
      tdAct.appendChild(remBtn);
      tr.appendChild(tdAct);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    summaryDiv.appendChild(table);
  }

  /**
   * Add an item to the current order. If the item already exists in the
   * order, its quantity is incremented. Otherwise it is added with
   * quantity 1.
   *
   * @param {string} name
   * @param {string} category
   */
  function addItemToOrder(name, category) {
    if (!currentOrder) {
      return;
    }
    if (!currentOrder.items[name]) {
      currentOrder.items[name] = { category, quantity: 1 };
    } else {
      currentOrder.items[name].quantity += 1;
    }
    renderOrder();
  }

  /**
   * Remove an item entirely from the current order.
   *
   * @param {string} name
   */
  function removeItem(name) {
    if (!currentOrder || !currentOrder.items[name]) {
      return;
    }
    delete currentOrder.items[name];
    renderOrder();
  }

  /**
   * Update the quantity of an item in the current order. A positive delta
   * increases the quantity, a negative delta decreases it. If the new
   * quantity drops to zero or below the item is removed from the order.
   *
   * @param {string} name
   * @param {number} delta
   */
  function updateItemQuantity(name, delta) {
    if (!currentOrder || !currentOrder.items[name]) {
      return;
    }
    const item = currentOrder.items[name];
    item.quantity += delta;
    if (item.quantity <= 0) {
      delete currentOrder.items[name];
    }
    renderOrder();
  }

  /**
   * Load previously stored orders from localStorage into the global
   * `orders` array. If none exist, `orders` will be an empty array.
   */
  function loadOrders() {
    const stored = localStorage.getItem("orders");
    if (stored) {
      try {
        orders = JSON.parse(stored);
      } catch (e) {
        orders = [];
      }
    } else {
      orders = [];
    }
  }

  /**
   * Save the global `orders` array into localStorage so that other pages
   * (like the kitchen display) can access the data.
   */
  function saveOrders() {
    localStorage.setItem("orders", JSON.stringify(orders));
  }

  /**
   * Save the array of custom items to localStorage. These are items
   * added by the user at runtime that are not part of the original
   * listofitems.txt file.
   */
  function saveCustomItems() {
    localStorage.setItem("customItems", JSON.stringify(customItems));
  }

  /**
   * Clear the current order and reset the interface. This hides the
   * menu and order sections, clears any messages and resets the
   * reservation form.
   */
  function clearCurrentOrder() {
    currentOrder = null;
    document.getElementById("menu-section").classList.add("hidden");
    document.getElementById("order-section").classList.add("hidden");
    document.getElementById("reservation-section").classList.remove("hidden");
    // Clear the reservation input
    document.getElementById("reservation-number").value = "";
    // Clear messages
    document.getElementById("reservation-message").textContent = "";
    document.getElementById("order-message").textContent = "";
  }

  /**
   * Initialize the entire application. Called on DOMContentLoaded.
   */
  async function init() {
    await loadItems();
    renderMenu();
    loadOrders();
    // Reservation form submit
    const reservationForm = document.getElementById("reservation-form");
    reservationForm.addEventListener("submit", (evt) => {
      evt.preventDefault();
      const input = document.getElementById("reservation-number");
      const reservationNumber = input.value.trim();
      if (!reservationNumber) {
        return;
      }
      currentOrder = {
        id: reservationNumber,
        items: {},
        createdAt: new Date().toISOString(),
      };
      // Show menus and order sections
      document.getElementById("menu-section").classList.remove("hidden");
      document.getElementById("order-section").classList.remove("hidden");
      // Hide reservation section
      document.getElementById("reservation-section").classList.add("hidden");
      // Clear any previous messages
      document.getElementById("reservation-message").textContent = "";
      document.getElementById("order-message").textContent = "";
      // Clear order summary area
      renderOrder();
    });
    // Add new item button
    document
      .getElementById("add-item-button")
      .addEventListener("click", () => {
        const categoryInput = document.getElementById("new-category");
        const nameInput = document.getElementById("new-item-name");
        const category = categoryInput.value.trim();
        const name = nameInput.value.trim();
        if (!category || !name) {
          return;
        }
        // Add to global items and to custom items list
        const newItem = { category, name };
        items.push(newItem);
        customItems.push(newItem);
        saveCustomItems();
        // Re-render menu and clear input
        renderMenu();
        categoryInput.value = "";
        nameInput.value = "";
      });
    // Submit order button
    document
      .getElementById("submit-order-button")
      .addEventListener("click", () => {
        // Ensure there is a current order with at least one item
        if (!currentOrder || Object.keys(currentOrder.items).length === 0) {
          document.getElementById("order-message").textContent =
            "Add at least one item before submitting.";
          return;
        }
        /*
         * Before appending the new order, refresh the local `orders` array
         * from localStorage. This prevents a bug where a previously loaded
         * index.html page still holds stale order data after the user has
         * removed orders on the kitchen display and navigated back via the
         * browser's Back button. Without reloading, the stale `orders`
         * array would cause old orders to be re-saved along with the new
         * order, creating duplicate entries. Calling loadOrders() here
         * ensures we always start from the latest state in localStorage.
         */
        loadOrders();
        // Append current order to orders array
        orders.push(currentOrder);
        saveOrders();
        // Show confirmation message
        document.getElementById("order-message").textContent =
          "Order #" + currentOrder.id + " has been submitted.";
        // Clear order
        clearCurrentOrder();
      });
    // Clear order button
    document
      .getElementById("clear-order-button")
      .addEventListener("click", () => {
        // Reset the current order but keep the reservation number
        if (currentOrder) {
          currentOrder.items = {};
          renderOrder();
        }
      });
  }

  // Initialize when the DOM has loaded
  document.addEventListener("DOMContentLoaded", init);
})();