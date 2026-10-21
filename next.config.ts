import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/gioithieu",
        destination: "/gioi-thieu",
        permanent: true,
      },
      {
        source: "/tintuc",
        destination: "/tin-tuc",
        permanent: true,
      },
      {
        source: "/diendan",
        destination: "/dien-dan",
        permanent: true,
      },
      {
        source: "/phananh",
        destination: "/phan-anh",
        permanent: true,
      },
      {
        source: "/huongdan",
        destination: "/huong-dan",
        permanent: true,
      },
      {
        source: "/hocsinh3tot",
        destination: "/hoc-sinh-3-tot",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
