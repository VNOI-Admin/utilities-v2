'use client';

import Link from 'next/link';
import { useUser } from '../hooks/useUser';

export default function Navbar(): JSX.Element {
    const { logout } = useUser();
    return <header className="bg-white shadow py-4 px-8 grid grid-cols-3 items-center">
        <div className="flex gap-2 items-center">
            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFaElEQVR4nO2ZXYhUZRjHf1pZRh8XpVZihYIRWYhkVAQiRUGUFxVFdOGFaHRRUSoEXexlhCRIYV10oUUFXlSku+26rrs73x9nvmdntjQRKmnJVpddJV2f88R5d2adOTsze2a/cmEf+N+d857f/5znfZ7nnYGFWIhrN1RZxHwOVRZrgRe0yE7NsYr5GlpgkxT4XQp0apEX5+WX0SL3SB8Juw+VPDnN87rzhZhPoXlukT4O23nUkeTIaI7NzKfQQ1wnOQ7YObQsyfKNJlnGfAlnD0iOL+wsWpZkGNAszzNfwsl/yfKtMZAZk6SwNU3LnG5y7ecRLbKjpvIl5Xiw5r2/cqOk8RkD6ZJSxsh32s1Nsw9/gg3Szz92P2oXSyqU1FeSs1nzDGqWR2uuEeUOSXGqDG+URCVJ+6ya0F94TIqcnwzeyNmoOQbU4vaaa2V4XFJcLsMbJVBJ8P2slFotlN580SN8FtEMWxuumeLDSngjC1WLlmse3gnt5npJkq2EdyRxRjXGRmYFvjAz8OXQBE9Xwttx1I6hEiM+7co02/DlEIueSnijKKphXmbG4fvqwjv1fNuUnmXxnBvejqASwT878PlqeCOns2Zp0xBLp9Slo5yuhDcKoxrggTmBL3dXSdOrEW5r1oTE+MgNbwwE2dXcQv2EvVSaKvCK0cBpTpIm5jSrpl5chM1ueDuESpDWpgzoSZZLkfxk8M6GlQxH3PAVo0FBU6z0/FyLmyXCaCW8HTQGzjRlwCyWZrkUyNeFz1ytNpJmrxt+fDRIcEot1nh9roQ5bcBL8EYBdCr7asxEnlwj+PENmOJLN3zFaHBGY6zzZCBIwA1v+1H1c2/TBsZN5MjVg686sKQ45IYvNyiJM6BR1k9qIESvG94Y6Ob+KRmoNFEPfvy6PEskQZsbvtygJMY5jfFkQwMBYm5422cM3DVlAwYuywrN8IqnjWjRW2s0MONBhBGN8GxdA0H+dsOLj1HnCzNX4fQAiWPVGg0cSZhLGualCff5We2GN2+/h745gx+HsbhT4vS54cs1XsJc0VB1OmqA96vSprekbg7MuQEDFGKlxDjlhrevNihbg7wzXgR8nJwA32P06swApVmnUdY2dY/FGonypxveLjcpP7YG2D18jJ3iqwHfzZAGuHX68BkelhT/ShKRJJ+rxd2e742yVkL85Ya3nXwv5fz5dkbPtaF2T9Wbdwzsmx54gvucccAcwCtqvCS4IAk+0ygPeVonwHoJMVhV4wPVG3a4HR1sQ+V4Cf44w9Mqn5LiEzOYpRit16BMk4rh0zjbJvsqGuAJCTJSBe9Kmwsd6ODhkoku3psyvPntJkXOPRqIxYkJNb58BIxiS4SkhNmrYbZrmKc0xmqnPDq67GPT8M/sv+JHasGXUkYvdqBnf6BLW6b4y4SmeUtSDEyAT3DBGarU4l2JI5XwtQ4ilRNlOW1GutCzrfXhjY6j0kVn0wOcWtwgKQ42GMquONeYa2M8IzEGJtT4MnyNibKcNiOdY7luoGvAG3Wh2olP25o4GEmaTxvAd2iCHVWGkyyTKAclgj0pvKu7Drej51obwB8rqdNjKmmGLXXhLeIN7w2xQcL86HRXL/Dai9rd6FArOnSkIfyY2nnNy9sPNUgbT39GaIxVGuQDCeKXAJfqwevYW/9Nutl3/ic2ahcfG3A3/NGSOtjT+MFZVtSCd6QWu73AT1gzzxLtZYMG2KI+tqufHdrLG9rDZg2yvOpaZZEeY38deOcLvO3NQHXaXNI4bzJHoS0s1k6+rgH/h3bW/nG4KiTBHkkyKgkuisVXXo+AM27iKLu0g5PawZB2cFjbvJ+nnc24dE4PDguxEPxv8R9ipmBIcJKSkwAAAABJRU5ErkJggg=="></img>
            <h3 className="text-xl font-bold text-gray-900">
                <Link href='/'>VNCS</Link>
            </h3>
        </div>
        <h1 className="text-center mx-auto text-3xl">Coach view</h1>
        <div className='justify-self-end'>
            Logged in as admin
            <Link onClick={logout} href='/'> Logout</Link>
        </div>
    </header>;
}