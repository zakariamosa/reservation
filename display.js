/*
 * display.js
 *
 * Script for the kitchen display page. This page reads orders from
 * localStorage and presents them in a large format suitable for kitchen
 * staff. Orders can be marked as completed and removed from the list.
 * Multiple orders can be selected and combined into a single batch
 * summary that aggregates item quantities.
 */

(function () {
  let orders = [];

  /**
   * Load orders from localStorage into the local `orders` array.
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
   * Save the current `orders` array back into localStorage. This is
   * necessary after marking orders as completed.
   */
  function saveOrders() {
    localStorage.setItem("orders", JSON.stringify(orders));
  }

  /**
   * Render the list of orders into the DOM. Each order shows its
   * reservation number, the list of items and a checkbox for batch
   * selection. A button allows marking the order as completed.
   */
  function renderOrders() {
    const container = document.getElementById("orders-list");
    container.innerHTML = "";
    if (!orders || orders.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "No orders available.";
      container.appendChild(empty);
      return;
    }
    orders.forEach((order, index) => {
      const orderDiv = document.createElement("div");
      orderDiv.className = "order";
      // Header containing checkbox, reservation number and complete button
      const headerDiv = document.createElement("div");
      headerDiv.className = "order-header";
      // Checkbox for selecting this order for batching
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "order-checkbox";
      checkbox.dataset.index = index.toString();
      headerDiv.appendChild(checkbox);
      // Reservation number display
      const resSpan = document.createElement("span");
      resSpan.className = "res-number";
      resSpan.textContent = "Reservation #" + order.id;
      headerDiv.appendChild(resSpan);
      // Complete button
      const completeBtn = document.createElement("button");
      completeBtn.className = "complete";
      completeBtn.textContent = "Mark Completed";
      // Store the index on the button itself so that the correct order is
      // removed when clicked. This avoids relying on closures that may
      // become outdated after a refresh.
      completeBtn.dataset.index = index.toString();
      completeBtn.addEventListener("click", (ev) => {
        const idxStr = ev.currentTarget.dataset.index;
        const idx = parseInt(idxStr);
        if (!isNaN(idx)) {
          removeOrder(idx);
        }
      });
      headerDiv.appendChild(completeBtn);
      orderDiv.appendChild(headerDiv);
      // List of items
      const ul = document.createElement("ul");
      ul.className = "order-items";
      Object.keys(order.items).forEach((name) => {
        const item = order.items[name];
        const li = document.createElement("li");
        li.textContent = `${name} × ${item.quantity}`;
        ul.appendChild(li);
      });
      orderDiv.appendChild(ul);
      container.appendChild(orderDiv);
    });
  }

  /**
   * Remove an order from the list when it has been completed. This
   * updates the orders array, saves it to localStorage and re-renders
   * the orders list.
   *
   * @param {number} index
   */
  function removeOrder(index) {
    orders.splice(index, 1);
    saveOrders();
    renderOrders();
  }

  /**
   * Combine the selected orders into a single summary object mapping
   * item names to their aggregated quantities. The summary is returned.
   *
   * @returns {Object<string, number>} A mapping of item names to total quantities
   */
  function buildBatchSummary() {
    const selectedCheckboxes = Array.from(
      document.querySelectorAll(".order-checkbox:checked")
    );
    const indices = selectedCheckboxes.map((cb) => parseInt(cb.dataset.index));
    const summary = {};
    indices.forEach((i) => {
      const order = orders[i];
      if (!order) return;
      Object.keys(order.items).forEach((name) => {
        const qty = order.items[name].quantity;
        summary[name] = (summary[name] || 0) + qty;
      });
    });
    return summary;
  }

  /**
   * Render the batch summary into the DOM. Shows a table summarising
   * total item quantities for the selected orders.
   *
   * @param {Object<string, number>} summary
   */
  function renderBatchSummary(summary) {
    const container = document.getElementById("batch-summary");
    container.innerHTML = "";
    const names = Object.keys(summary);
    if (names.length === 0) {
      const p = document.createElement("p");
      p.textContent = "No orders selected or no items to display.";
      container.appendChild(p);
      return;
    }
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    ["Item", "Total Qty"].forEach((h) => {
      const th = document.createElement("th");
      th.textContent = h;
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    names.forEach((name) => {
      const row = document.createElement("tr");
      const tdName = document.createElement("td");
      tdName.textContent = name;
      row.appendChild(tdName);
      const tdQty = document.createElement("td");
      tdQty.textContent = summary[name];
      row.appendChild(tdQty);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  }

  /**
   * Initialise the display page by loading orders and attaching event
   * listeners to the buttons.
   */
  function init() {
    loadOrders();
    renderOrders();
    // Refresh button reloads orders from localStorage
    document.getElementById("refresh-button").addEventListener("click", () => {
      loadOrders();
      renderOrders();
    });
    // Batch button combines selected orders
    document.getElementById("batch-button").addEventListener("click", () => {
      const summary = buildBatchSummary();
      renderBatchSummary(summary);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();