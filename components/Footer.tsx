import { Container, Badge } from "react-bootstrap";
import { Heart, Github } from "react-bootstrap-icons";

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getRepoUrl(): string {
  const owner = process.env.VERCEL_GIT_REPO_OWNER;
  const slug = process.env.VERCEL_GIT_REPO_SLUG;

  return `https://github.com/${owner}/${slug}`
}

export default function Footer() {
  return (
    <Container>
      <footer className="d-flex justify-content-around align-items-center py-3 my-4 border-top">
        <div className="d-flex align-items-center">
          <span className="me-2">Made with love</span>
          <Heart />
        </div>

        <div className="d-flex align-items-center">
          <a
            href={getRepoUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-decoration-none text-white d-flex align-items-center me-3"
          >
            <Github size={25} className="me-1" />
            <small>{process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7)}</small>
          </a>

          {process.env.VERCEL_ENV && (
            <Badge bg="secondary">{titleCase(process.env.VERCEL_ENV)}</Badge>
          )}
        </div>
      </footer>
    </Container>
  );
}
