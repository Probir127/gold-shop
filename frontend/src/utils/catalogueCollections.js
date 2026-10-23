// Category names and destinations are owned by the catalogue, never editorial copy.
export function catalogueCollections(categories = [], products = []) {
  return categories.map(category => {
    const pieces = products.filter(product => Number(product.category) === Number(category.id));
    const photographed = pieces.find(product => product.in_stock && product.image) || pieces.find(product => product.image);
    return { ...category, image: photographed?.image || null, imageAlt: photographed?.name || category.name, count: pieces.length };
  });
}
