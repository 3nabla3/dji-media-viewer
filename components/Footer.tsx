import { Container, Badge } from "react-bootstrap";
import { Heart, Github } from "react-bootstrap-icons";

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
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
            href={process.env.NEXT_PUBLIC_REPO_URL}
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
          <ul>
            <li>VERCEL_GIT_REPO_SLUG = {process.env.VERCEL_GIT_REPO_SLUG}</li>
            <li>VERCEL_GIT_REPO_OWNER = {process.env.VERCEL_GIT_REPO_OWNER}</li>
            <li>VERCEL_GIT_REPO_SLUG = {process.env.VERCEL_GIT_REPO_ID}</li>
          </ul>
        </div>
      </footer>
    </Container>
  );
}
