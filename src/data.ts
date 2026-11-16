export type Product = {
  id: string; name: string; category: string; price: number; description: string;
  image: string; tag?: string;
}

const photo = (id: string, w=800) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`

export const products: Product[] = [
  { id:'beef-burger', name:'Classic Beef Burger', category:'Burgers', price:5500, description:'Juicy grilled beef patty, fresh lettuce, tomatoes, cheese and signature sauce.', image:photo('photo-1568901346375-23c9450c58cd'), tag:'Bestseller' },
  { id:'double-cheese', name:'Double Cheese Burger', category:'Burgers', price:8000, description:'Two juicy beef patties layered with melted cheese, lettuce and special burger sauce.', image:photo('photo-1553979459-d2229ba7433a'), tag:'Big bite' },
  { id:'chicken-burger', name:'Crispy Chicken Burger', category:'Burgers', price:6000, description:'Golden crispy chicken breast, fresh vegetables and creamy mayonnaise.', image:photo('photo-1606755962773-d324e0a13086') },
  { id:'pepperoni-pizza', name:'Pepperoni Pizza', category:'Pizza', price:12000, description:'Classic pizza topped with mozzarella cheese, pepperoni and rich tomato sauce.', image:photo('photo-1628840042765-356cda07504e'), tag:'Fan favourite' },
  { id:'bbq-pizza', name:'BBQ Chicken Pizza', category:'Pizza', price:13500, description:'Grilled chicken, mozzarella cheese, barbecue sauce and fresh vegetables.', image:photo('photo-1571407970349-bc81e7e96d47') },
  { id:'supreme-pizza', name:'Supreme Pizza', category:'Pizza', price:15000, description:'A delicious combination of chicken, beef, pepperoni, vegetables and mozzarella.', image:photo('photo-1513104890138-7c749659a591') },
  { id:'chicken-shawarma', name:'Chicken Shawarma', category:'Shawarma & Snacks', price:3500, description:'Freshly grilled chicken, sausages, vegetables and creamy signature sauce wrapped in soft flatbread.', image:photo('photo-1529006557810-274b9b2fc783'), tag:'Street favourite' },
  { id:'beef-shawarma', name:'Beef Shawarma', category:'Shawarma & Snacks', price:4000, description:'Seasoned beef strips, fresh vegetables and delicious creamy sauce.', image:photo('photo-1561651823-34feb02250e4') },
  { id:'mixed-shawarma', name:'Chicken & Beef Shawarma', category:'Shawarma & Snacks', price:5000, description:'A generous combination of grilled chicken, beef, sausages and signature sauce.', image:photo('photo-1626700051175-6818013e1d4f') },
  { id:'hot-dog', name:'Loaded Hot Dog', category:'Shawarma & Snacks', price:3500, description:'Grilled sausage topped with cheese, vegetables and special sauce.', image:photo('photo-1612392062798-2dbaa6e9f4b5') },
  { id:'club-sandwich', name:'Club Sandwich', category:'Shawarma & Snacks', price:4500, description:'Triple-layer toasted sandwich filled with chicken, eggs, lettuce, tomatoes and mayonnaise.', image:photo('photo-1528735602780-2552fd46c7af') },
  { id:'fries', name:'Classic French Fries', category:'Sides', price:2000, description:'Golden, crispy potato fries with a soft fluffy centre.', image:photo('photo-1573080496219-bb080dd4f877') },
  { id:'cheese-fries', name:'Loaded Cheese Fries', category:'Sides', price:3500, description:'Crispy fries finished with a generous blanket of melted cheese.', image:photo('photo-1630384060421-cb20d0e0649d') },
  { id:'wings', name:'Spicy Chicken Wings (6 pieces)', category:'Sides', price:5000, description:'Six juicy chicken wings tossed in a bold, spicy glaze.', image:photo('photo-1527477396000-e27163b481c2'), tag:'Hot pick' },
  { id:'nuggets', name:'Chicken Nuggets (6 pieces)', category:'Sides', price:4000, description:'Six golden chicken nuggets, crisp outside and tender inside.', image:photo('photo-1562967914-608f82629710') },
  { id:'onion-rings', name:'Onion Rings', category:'Sides', price:2500, description:'Sweet onion rings in a crunchy golden coating.', image:photo('photo-1639024471283-03518883512d') },
  { id:'strawberry-shake', name:'Fresh Strawberry Milkshake', category:'Drinks', price:3500, description:'A creamy strawberry milkshake blended until smooth and dreamy.', image:photo('photo-1572490122747-3968b75cc699'), tag:'Chilled' },
  { id:'chocolate-shake', name:'Chocolate Milkshake', category:'Drinks', price:3500, description:'Rich chocolate flavour in a cool, creamy shake.', image:photo('photo-1577805947697-89e18249d767') },
  { id:'vanilla-shake', name:'Vanilla Milkshake', category:'Drinks', price:3000, description:'A classic, silky vanilla shake made for slow sips.', image:photo('photo-1541658016709-82535e94bc69') },
  { id:'orange-juice', name:'Fresh Orange Juice', category:'Drinks', price:2500, description:'Bright, refreshing orange juice with a fresh citrus taste.', image:photo('photo-1600271886742-f049cd451bba') },
  { id:'soft-drinks', name:'Soft Drinks', category:'Drinks', price:1000, description:'A chilled fizzy drink to go with your favourite meal.', image:photo('photo-1554866585-cd94860890b7') },
  { id:'water', name:'Bottled Water', category:'Drinks', price:500, description:'Cool bottled water to keep you refreshed.', image:photo('photo-1564419320461-6870880221ad') },
  { id:'waffles', name:'Chocolate Waffles', category:'Desserts', price:4000, description:'Warm golden waffles finished with a rich chocolate drizzle.', image:photo('photo-1562376552-0d160a2f238d'), tag:'Sweet treat' },
  { id:'pancakes', name:'Classic Pancakes', category:'Desserts', price:3500, description:'A fluffy stack of golden pancakes, soft and satisfying.', image:photo('photo-1528207776546-365bb710ee93') },
  { id:'ice-cream', name:'Vanilla Ice Cream', category:'Desserts', price:2000, description:'Smooth, creamy vanilla ice cream served chilled.', image:photo('photo-1501446529957-6226bd447c46') },
  { id:'brownies', name:'Chocolate Brownies', category:'Desserts', price:2500, description:'Rich chocolate brownies with a soft, fudgy centre.', image:photo('photo-1606313564200-e75d5e30476c') }
]
export const categories = ['All','Burgers','Pizza','Shawarma & Snacks','Sides','Drinks','Desserts']
export const formatNaira = (amount:number) => '₦' + amount.toLocaleString('en-NG')
export const WHATSAPP_NUMBER = '2349163149653'
