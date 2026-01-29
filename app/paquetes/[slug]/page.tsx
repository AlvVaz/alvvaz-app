import { redirect } from "next/navigation";

type PaqueteDetailPageProps = {
  params: { slug: string };
};

export default function PaqueteDetailPage({ params }: PaqueteDetailPageProps) {
  redirect(`/promociones/${params.slug}`);
}
