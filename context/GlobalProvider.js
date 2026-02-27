import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser } from '../lib/appwrite';

const GlobalContext = createContext();
export const useGlobalContext = () => useContext(GlobalContext);

const GlobalProvider = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Стан для постів
    const [posts, setPosts] = useState([]);

    // Функція для оновлення списку постів
    const updatePosts = (newPost) => {
        setPosts((prevPosts) => [...prevPosts, newPost]);
    };

    useEffect(() => {
        getCurrentUser()
            .then((res) => {
                if (res) {
                    setIsLoggedIn(true);
                    setUser(res);
                } else {
                    setIsLoggedIn(false);
                    setUser(null);
                }
            })
            .catch((error) => {
                console.log(error);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, []);

    return (
        <GlobalContext.Provider
            value={{
                isLoggedIn,
                setIsLoggedIn,
                user,
                setUser,
                isLoading,
                posts,        // Передаємо список постів
                updatePosts,  // Передаємо функцію для оновлення постів
            }}
        >
            {children}
        </GlobalContext.Provider>
    );
};

export default GlobalProvider;
