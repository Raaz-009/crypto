document.addEventListener('DOMContentLoaded', function() {
    const priceElement = document.getElementById('price-value');
    const refreshButton = document.getElementById('refresh-button');

    function fetchPrice() {
        fetch('/api/ethereum-price')
            .then(response => response.json())
            .then(data => {
                priceElement.textContent = data.price;
            })
            .catch(error => console.error('Error fetching price:', error));
    }

    refreshButton.addEventListener('click', fetchPrice);

    // Fetch the price when the page loads
    fetchPrice();
});
