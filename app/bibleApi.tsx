export default async function getBibleVerse(book: string, chapter: number, verse: number): Promise<string> {
    try {
        const response = await fetch(`https://jsonbible.com/search/verses.php?json={"book": "${book}", "chapter": "${chapter}", "verse": "${verse}"`);
    }
}