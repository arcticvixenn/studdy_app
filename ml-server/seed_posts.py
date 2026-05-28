import os
from dotenv import load_dotenv
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.id import ID
from appwrite.permission import Permission
from appwrite.role import Role

load_dotenv()

client = Client()
client.set_endpoint(os.getenv("APPWRITE_ENDPOINT"))
client.set_project(os.getenv("APPWRITE_PROJECT_ID"))
client.set_key(os.getenv("APPWRITE_API_KEY"))

databases = Databases(client)

DATABASE_ID = os.getenv("APPWRITE_DATABASE_ID")
POSTS_ID = os.getenv("APPWRITE_POSTS_COLLECTION_ID", "posts")

AUTHOR_ID = "seed_ml_system"
AUTHOR_NAME = "Studdy ML"
AUTHOR_AVATAR = "https://ui-avatars.com/api/?name=Studdy+ML&background=7C3AED&color=fff"

posts = [
    {
        "title": "Що таке градієнтний спуск",
        "content": (
            "Градієнтний спуск — це метод оптимізації, який використовується для навчання "
            "моделей машинного навчання. Його ідея полягає в тому, щоб поступово змінювати "
            "параметри моделі у напрямку зменшення помилки. Якщо модель часто помиляється, "
            "алгоритм аналізує похідні функції втрат і оновлює ваги так, щоб наступний прогноз "
            "був точнішим."
        ),
        "category": "Штучний інтелект",
        "mediaType": "text",
    },
    {
        "title": "Основи нейронних мереж",
        "content": (
            "Нейронна мережа складається з шарів штучних нейронів, які перетворюють вхідні "
            "дані на результат. Кожен нейрон має ваги, зміщення та функцію активації. Під час "
            "навчання мережа змінює ваги, щоб зменшити помилку між прогнозом і правильним "
            "результатом."
        ),
        "category": "Штучний інтелект",
        "mediaType": "text",
    },
    {
        "title": "Функції активації в нейронних мережах",
        "content": (
            "Функція активації визначає, як нейрон реагує на вхідний сигнал. Найпоширеніші "
            "функції активації — sigmoid, tanh та ReLU. ReLU часто використовується у глибоких "
            "нейронних мережах, бо вона проста, швидка та допомагає зменшити проблему "
            "згасання градієнта."
        ),
        "category": "Штучний інтелект",
        "mediaType": "text",
    },
    {
        "title": "Метод k-найближчих сусідів",
        "content": (
            "Метод k-найближчих сусідів, або kNN, використовується для класифікації та "
            "регресії. Алгоритм знаходить k найближчих об'єктів до нового прикладу та приймає "
            "рішення на основі їхніх класів або значень. Якість kNN залежить від вибору "
            "метрики відстані, кількості сусідів і масштабування ознак."
        ),
        "category": "Аналіз даних",
        "mediaType": "text",
    },
    {
        "title": "Класифікація даних у машинному навчанні",
        "content": (
            "Класифікація — це задача машинного навчання, у якій модель повинна віднести "
            "об'єкт до одного з наперед визначених класів. Наприклад, модель може визначати, "
            "чи є лист спамом, чи належить зображення до певної категорії, або який рівень "
            "знань має користувач."
        ),
        "category": "Аналіз даних",
        "mediaType": "text",
    },
    {
        "title": "Що таке перенавчання моделі",
        "content": (
            "Перенавчання виникає тоді, коли модель занадто добре запам'ятовує навчальні "
            "дані, але погано працює на нових прикладах. Це означає, що модель вивчила шум "
            "замість загальних закономірностей. Для боротьби з перенавчанням використовують "
            "регуляризацію, крос-валідацію та збільшення кількості даних."
        ),
        "category": "Штучний інтелект",
        "mediaType": "text",
    },
    {
        "title": "Регресія та прогнозування",
        "content": (
            "Регресія використовується для прогнозування числових значень. Наприклад, можна "
            "передбачати ціну товару, оцінку студента або майбутній курс валюти. Лінійна "
            "регресія будує залежність між ознаками та цільовим значенням, а якість прогнозу "
            "оцінюється за допомогою помилки."
        ),
        "category": "Аналіз даних",
        "mediaType": "text",
    },
    {
        "title": "Навіщо потрібна нормалізація даних",
        "content": (
            "Нормалізація приводить ознаки до схожого масштабу. Це важливо для алгоритмів, "
            "які залежать від відстаней або градієнтів, наприклад kNN, логістична регресія "
            "та нейронні мережі. Без нормалізації одна ознака з великими значеннями може "
            "занадто сильно впливати на результат моделі."
        ),
        "category": "Аналіз даних",
        "mediaType": "text",
    },
]

def main():
    created = 0

    for post in posts:
        document = {
            "title": post["title"],
            "content": post["content"],
            "category": post["category"],
            "mediaType": post["mediaType"],

            "authorId": AUTHOR_ID,
            "authorName": AUTHOR_NAME,
            "authorAvatar": AUTHOR_AVATAR,

            "imageUrl": "",
            "imageId": "",
            "videoUrl": "",
            "videoId": "",
            "thumbnailUrl": "",
            "thumbnailId": "",

            "likesCount": 0,
            "commentsCount": 0,
        }

        databases.create_document(
            DATABASE_ID,
            POSTS_ID,
            ID.unique(),
            document,
            [
                Permission.read(Role.any()),
            ],
        )

        created += 1
        print(f"Created post: {post['title']}")

    print(f"Done. Created {created} posts.")


if __name__ == "__main__":
    main()