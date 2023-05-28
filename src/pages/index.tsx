import { type NextPage } from "next";
import { NewTweetForm } from "~/components/NewTweetForm";

const Home: NextPage = () => {
  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-white pt-2">
        <h1 className="front-bold mb-2 px-4 text-lg">Home</h1>
      </header>
      <NewTweetForm />
    </>
  );
};

export default Home;
