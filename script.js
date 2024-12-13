document.addEventListener('DOMContentLoaded', () => {
    const track = document.getElementById('carouselTrack');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const modal = document.getElementById('propertyModal');
    const modalMainImage = document.getElementById('modalMainImage');
    const thumbnailContainer = document.querySelector('.thumbnail-container');
    const closeModal = document.querySelector('.close-modal');
    let currentIndex = 0;
    let currentProperty = null;
    let currentImageIndex = 0;
    let autoplayInterval;

    // Crear el modal de galería
    const galleryModal = document.getElementById('galleryModal');

    function formatPrice(price) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    }

    function formatArea(area) {
        if (!area) return 'N/A';
        return `${area} sq ft`;
    }

    function createLocationSection(property) {
        const latitude = property.latitude;
        const longitude = property.longitude;
        const mapId = `map-${property.id}`;
        const osmUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=15`;
    
        return `
            <div class="details-section location-section">
                <h3>Location</h3>
                <div class="location-content">
                    <div id="${mapId}" class="map-container"></div>
                    <div class="location-actions">
                        <p class="location-address">${property.unparsedaddress}</p>
                        <div class="location-buttons">
                            <a href="${osmUrl}" target="_blank" class="view-map-btn">View on OpenStreetMap</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function initializePropertyMap(property) {
        const mapId = `map-${property.id}`;
        const mapElement = document.getElementById(mapId);
        
        if (mapElement && property.latitude && property.longitude) {
            // Si ya existe un mapa en este contenedor, lo destruimos
            if (mapElement._leaflet_id) {
                mapElement._leaflet = null;
            }
    
            // Crear el mapa
            const map = L.map(mapId, {
                zoomControl: false,  // Desactivamos los controles por defecto
                dragging: false,     // Desactivamos el arrastre para un aspecto más minimalista
                touchZoom: false,
                scrollWheelZoom: false
            }).setView([property.latitude, property.longitude], 15);
    
            // Añadir el tile layer con un estilo elegante
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);
    
            // Añadir un marcador personalizado
            L.marker([property.latitude, property.longitude], {
                icon: L.divIcon({
                    className: 'custom-marker',
                    html: '<div class="marker-pin"></div>',
                    iconSize: [30, 30],
                    iconAnchor: [15, 30]
                })
            }).addTo(map);
        }
    }
    

    function initializeCarousel() {
        track.innerHTML = '';
        window.SAMPLE_LISTINGS.forEach(property => {
            track.insertAdjacentHTML('beforeend', createPropertyCard(property));
        });
        attachPropertyCardListeners();
        updateCarousel();
    }

    function createPropertyCard(property) {
        return `
            <div class="property-card" data-property-id="${property.id}">
                <img src="${property.photos?.[0]?.Uri800 || '/api/placeholder/800/600'}"
                     alt="${property.subdivisionname}"
                     class="property-image">
                <div class="property-overlay"></div>
                <div class="property-content">
                    <h3 class="property-title">${property.subdivisionname}</h3>
                    <p class="property-location">${property.city}, ${property.mlsareamajor}</p>
                    <p class="property-price">${formatPrice(property.currentpricepublic)}</p>
                    <button class="property-details-btn">VIEW DETAILS</button>
                </div>
            </div>
        `;
    }

    function setupModalGallery(property) {
        const mainImageContainer = modal.querySelector('.main-image-container');
        const prevBtn = mainImageContainer.querySelector('.modal-nav-btn.prev');
        const nextBtn = mainImageContainer.querySelector('.modal-nav-btn.next');
        let currentModalIndex = 0;

        function updateModalMainImage() {
            modalMainImage.src = property.photos[currentModalIndex].Uri800;
            updateThumbnails();
        }

        function updateThumbnails() {
            thumbnailContainer.innerHTML = property.photos.map((photo, index) => `
                <img src="${photo.Uri300}" 
                     class="thumbnail ${index === currentModalIndex ? 'active' : ''}"
                     data-index="${index}"
                     alt="Thumbnail ${index + 1}">
            `).join('');

            thumbnailContainer.querySelectorAll('.thumbnail').forEach(thumb => {
                thumb.addEventListener('click', () => {
                    currentModalIndex = parseInt(thumb.dataset.index);
                    updateModalMainImage();
                });
            });
        }

        prevBtn.addEventListener('click', () => {
            if (currentModalIndex > 0) {
                currentModalIndex--;
                updateModalMainImage();
            }
        });

        nextBtn.addEventListener('click', () => {
            if (currentModalIndex < property.photos.length - 1) {
                currentModalIndex++;
                updateModalMainImage();
            }
        });

        // Keyboard navigation for modal gallery
        const handleKeyPress = (e) => {
            if (modal.classList.contains('show') && !galleryModal.classList.contains('show')) {
                if (e.key === 'ArrowLeft' && currentModalIndex > 0) {
                    currentModalIndex--;
                    updateModalMainImage();
                }
                if (e.key === 'ArrowRight' && currentModalIndex < property.photos.length - 1) {
                    currentModalIndex++;
                    updateModalMainImage();
                }
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        modal.addEventListener('hide', () => {
            document.removeEventListener('keydown', handleKeyPress);
        });

        updateModalMainImage();
    }

    function createGalleryModal() {
        const counter = galleryModal.querySelector('.gallery-counter');
        const mainImage = galleryModal.querySelector('.gallery-main img');
        const thumbsContainer = galleryModal.querySelector('.gallery-thumbs');
        const prevBtn = galleryModal.querySelector('.gallery-nav.prev');
        const nextBtn = galleryModal.querySelector('.gallery-nav.next');
        const closeBtn = galleryModal.querySelector('.gallery-close');
        let currentGalleryIndex = 0;

        function updateGalleryView() {
            mainImage.src = currentProperty.photos[currentGalleryIndex].Uri1600 || currentProperty.photos[currentGalleryIndex].Uri800;
            counter.textContent = `${currentGalleryIndex + 1} / ${currentProperty.photos.length}`;

            thumbsContainer.innerHTML = currentProperty.photos.map((photo, i) => `
                <img src="${photo.Uri300}" 
                     class="gallery-thumb ${i === currentGalleryIndex ? 'active' : ''}" 
                     data-index="${i}"
                     alt="Thumbnail ${i + 1}">
            `).join('');
        }

        function attachGalleryListeners() {
            thumbsContainer.querySelectorAll('.gallery-thumb').forEach(thumb => {
                thumb.addEventListener('click', () => {
                    currentGalleryIndex = parseInt(thumb.dataset.index);
                    updateGalleryView();
                });
            });

            prevBtn.addEventListener('click', () => {
                if (currentGalleryIndex > 0) {
                    currentGalleryIndex--;
                    updateGalleryView();
                }
            });

            nextBtn.addEventListener('click', () => {
                if (currentGalleryIndex < currentProperty.photos.length - 1) {
                    currentGalleryIndex++;
                    updateGalleryView();
                }
            });

            closeBtn.addEventListener('click', () => {
                galleryModal.classList.remove('show');
            });

            // Keyboard navigation for full gallery
            document.addEventListener('keydown', (e) => {
                if (galleryModal.classList.contains('show')) {
                    if (e.key === 'ArrowLeft' && currentGalleryIndex > 0) {
                        currentGalleryIndex--;
                        updateGalleryView();
                    }
                    if (e.key === 'ArrowRight' && currentGalleryIndex < currentProperty.photos.length - 1) {
                        currentGalleryIndex++;
                        updateGalleryView();
                    }
                    if (e.key === 'Escape') {
                        galleryModal.classList.remove('show');
                    }
                }
            });
        }

        updateGalleryView();
        attachGalleryListeners();
    }

    function startAutoplay() {
        stopAutoplay();
        autoplayInterval = setInterval(() => {
            if (currentIndex < window.SAMPLE_LISTINGS.length - 3) {
                currentIndex++;
            } else {
                currentIndex = 0;
            }
            updateCarousel(true);
        }, 6000);
    }

    function stopAutoplay() {
        if (autoplayInterval) {
            clearInterval(autoplayInterval);
        }
    }

    function updateCarousel(isAutoplay = false) {
        const cardWidth = track.querySelector('.property-card').offsetWidth;
        const gap = 32; // 2rem en píxeles
        const offset = -(currentIndex * (cardWidth + gap));
        
        track.style.transition = isAutoplay ? 'transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'transform 0.8s ease';
        track.style.transform = `translateX(${offset}px)`;

        prevButton.disabled = currentIndex === 0;
        nextButton.disabled = currentIndex >= window.SAMPLE_LISTINGS.length - 3;
        
        prevButton.style.opacity = currentIndex === 0 ? '0.5' : '1';
        nextButton.style.opacity = currentIndex >= window.SAMPLE_LISTINGS.length - 3 ? '0.5' : '1';
    }

    function parseAndFormatFeatures(features) {
        try {
            if (typeof features === 'string' && features.startsWith('{')) {
                const parsed = JSON.parse(features);
                return Object.keys(parsed)
                    .filter(key => parsed[key])
                    .map(key => key.replace(/([A-Z])/g, ' $1').trim())
                    .join(', ');
            } else if (typeof features === 'object') {
                return Object.keys(features)
                    .filter(key => features[key])
                    .map(key => key.replace(/([A-Z])/g, ' $1').trim())
                    .join(', ');
            }
            return features;
        } catch (e) {
            console.log('Error parsing features:', e);
            return features;
        }
    }

    function createFeaturesList(property) {
        const features = {
            'Interior Features': property.interiorfeatures,
            'Exterior Features': property.exteriorfeatures,
            'Pool Features': property.poolfeatures,
            'Patio Features': property.patioandporchfeatures,
            'Architectural Style': property.architecturalstyle,
            'Electric': property.electric,
            'Kitchen Appliances': property.kitchenappliances
        };

        let featuresHTML = '<div class="features-grid">';
        
        for (const [category, value] of Object.entries(features)) {
            if (value) {
                featuresHTML += `
                    <div class="feature-category">
                        <h4>${category}</h4>
                        <p>${parseAndFormatFeatures(value)}</p>
                    </div>
                `;
            }
        }
        
        featuresHTML += '</div>';
        return featuresHTML;
    }

    function updateModalContent(property) {
        currentProperty = property;
        currentImageIndex = 0;

        const detailsHTML = `
            <div class="property-header">
                <h2>${property.subdivisionname}</h2>
                <p class="property-location">${property.city}, ${property.mlsareamajor}</p>
                <p class="modal-price">${formatPrice(property.currentpricepublic)}</p>
            </div>

            <div class="gallery-preview">
                ${property.photos.slice(0, 4).map(photo => `
                    <img src="${photo.Uri300}" alt="Property preview">
                `).join('')}
                ${property.photos.length > 4 ? `
                    <div class="view-all-photos">
                        <span>View All ${property.photos.length} Photos</span>
                    </div>
                ` : ''}
            </div>

            <div class="data-grid">
                <div class="data-item">
                    <div class="data-label">Beds</div>
                    <div class="data-value">${property.bedstotal || 'N/A'}</div>
                </div>
                <div class="data-item">
                    <div class="data-label">Baths</div>
                    <div class="data-value">${property.bathroomstotaldecimal || 'N/A'}</div>
                </div>
                <div class="data-item">
                    <div class="data-label">Area</div>
                    <div class="data-value">${formatArea(property.buildingareatotal)}</div>
                </div>
            </div>

            <div class="details-section">
                <h3>Property Information</h3>
                <table class="property-details-table">
                    <tr><th>MLS ID</th><td>${property.mlsid}</td></tr>
                    <tr><th>Property Type</th><td>${property.propertytypelabel}</td></tr>
                    <tr><th>Property Class</th><td>${property.propertyclass}</td></tr>
                    <tr><th>Year Built</th><td>${property.yearbuilt || 'N/A'}</td></tr>
                    <tr><th>Lot Size</th><td>${property.lotsizedimensions || 'N/A'}</td></tr>
                    <tr><th>Total Rooms</th><td>${property.roomstotal || 'N/A'}</td></tr>
                    <tr><th>Status</th><td>${property.majorchangetype}</td></tr>
                </table>
            </div>

            ${createLocationSection(property)}

            ${property.virtualtourscount > 0 ? `
                <div class="virtual-tour">
                    <h3>Virtual Tour Available</h3>
                    <a href="${property.vrTour?.Uri || '#'}" target="_blank">View Virtual Tour</a>
                </div>
            ` : ''}

            <div class="details-section">
                <h3>Features</h3>
                ${createFeaturesList(property)}
            </div>

            <div class="details-section">
                <h3>Description</h3>
                <p>${property.publicremarks}</p>
            </div>
        `;

        document.querySelector('.property-details').innerHTML = detailsHTML;
        setupModalGallery(property);

            // Inicializar el mapa después de que el contenido esté en el DOM
            setTimeout(() => {
            initializePropertyMap(property);
            }, 100);
        // Attach gallery preview listeners
        const viewAllBtn = document.querySelector('.view-all-photos');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', () => {
                createGalleryModal();
                galleryModal.classList.add('show');
            });
        }
    }

    function attachPropertyCardListeners() {
        document.querySelectorAll('.property-card').forEach(card => {
            card.addEventListener('click', () => {
                const propertyId = card.dataset.propertyId;
                const property = window.SAMPLE_LISTINGS.find(p => p.id === propertyId);
                if (property) {
                    updateModalContent(property);
                    modal.classList.add('show');
                    document.body.style.overflow = 'hidden';
                    stopAutoplay();
                }
            });
        });
    }
    // Event Listeners
    prevButton.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateCarousel(true);
            stopAutoplay();
            startAutoplay();
        }
    });

    nextButton.addEventListener('click', () => {
        if (currentIndex < window.SAMPLE_LISTINGS.length - 3) {
            currentIndex++;
            updateCarousel(true);
            stopAutoplay();
            startAutoplay();
        }
    });

    closeModal.addEventListener('click', () => {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        startAutoplay();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modal.classList.remove('show');
            galleryModal.classList.remove('show');
            document.body.style.overflow = '';
            startAutoplay();
        }
        if (!modal.classList.contains('show') && !galleryModal.classList.contains('show')) {
            if (e.key === 'ArrowLeft') prevButton.click();
            if (e.key === 'ArrowRight') nextButton.click();
        }
    });

    // Handle page visibility
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAutoplay();
        } else {
            startAutoplay();
        }
    });

    // Prevent scroll when modal is open
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
            startAutoplay();
        }
    });

    galleryModal.addEventListener('click', (e) => {
        if (e.target === galleryModal) {
            galleryModal.classList.remove('show');
        }
    });

    // Touch Events for the carousel
    let touchStartX = 0;
    let touchEndX = 0;

    track.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });

    track.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe left
                nextButton.click();
            } else {
                // Swipe right
                prevButton.click();
            }
        }
    }

    // Initialize carousel
    initializeCarousel();
    startAutoplay();

    // Initialize map functionality
    function initMap() {
        // Add any map initialization code here if needed
        // This could include setting up map event listeners or additional functionality
    }

    // Optional: Load Google Maps API if not already loaded
    if (typeof google === 'undefined') {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&callback=initMap`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    }
});