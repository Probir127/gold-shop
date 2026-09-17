// Helper to generate price
const getPrice = () => {
    return null;
};

export const products = [
    {
        id: 1,
        name: "Royal Gold Ring",
        category: "rings",
        image: "/assets/images/1.jpg.jpeg",
        weight: 2.5,
        purity: "22K",
        price: getPrice(2.5, "22K"),
        bestseller: true
    },
    {
        id: 2,
        name: "Diamond Cut Ring",
        category: "rings",
        image: "/assets/images/10.jpg.jpeg",
        weight: 3.1,
        purity: "22K",
        price: getPrice(3.1, "22K"),
        new: true
    },
    {
        id: 3,
        name: "Premium Wristlet",
        category: "wristlets",
        image: "/assets/images/WRISTLET.jpg.jpeg",
        weight: 5.2,
        purity: "21K",
        price: getPrice(5.2, "21K"),
        bestseller: true
    },
    {
        id: 4,
        name: "Luxury Gold Earrings",
        category: "earrings",
        image: "/assets/images/5.jpg.jpeg",
        weight: 4.8,
        purity: "22K",
        price: getPrice(4.8, "22K"),
        bestseller: true
    },
    {
        id: 5,
        name: "Floral Gold Ring",
        category: "rings",
        image: "/assets/images/15.jpg.jpeg",
        weight: 1.8,
        purity: "22K",
        price: getPrice(1.8, "22K")
    },
    {
        id: 6,
        name: "Heavy Gold Bangle",
        category: "bangles",
        image: "/assets/images/16.jpg.jpeg",
        weight: 10.5,
        purity: "22K",
        price: getPrice(10.5, "22K")
    },
    {
        id: 7,
        name: "Elegant Wristlet",
        category: "wristlets",
        image: "/assets/images/WRISTLET 2.jpg.jpeg",
        weight: 4.2,
        purity: "21K",
        price: getPrice(4.2, "21K")
    },
    {
        id: 8,
        name: "Traditional Earrings",
        category: "earrings",
        image: "/assets/images/12.jpg.jpeg",
        weight: 6.5,
        purity: "22K",
        price: getPrice(6.5, "22K")
    },
    {
        id: 9,
        name: "Engagement Ring",
        category: "rings",
        image: "/assets/images/11.jpg.jpeg",
        weight: 3.8,
        purity: "22K",
        price: getPrice(3.8, "22K")
    },
    {
        id: 10,
        name: "Designer Bangle",
        category: "bangles",
        image: "/assets/images/17.jpg.jpeg",
        weight: 8.9,
        purity: "22K",
        price: getPrice(8.9, "22K")
    }
];

export const getFeaturedProducts = () => products.filter(p => p.bestseller || p.new).slice(0, 4);
