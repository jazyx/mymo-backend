// imageTest.js

const { Image } = require('../models')


Image.addImage({
  creator_id: "69bd9ae02a4a9869a160c7cd",
  filepath: "images/nodoc.webp",
  tags: { en: "joke" },
  description: { en: "cheating at noughts and crosses" },
  square: [10, 10, 360 ]
}).then(
  done => {
    console.log(
      "Added image:", JSON.stringify(done, null, 2)
    )

    const { _id } = done
    if (_id) {
      Image.addTags({
        _id,
        tags: { fr: "blague" }
      }).then(
        done => {
          console.log(
            "Tags added\n", JSON.stringify(done, null, '  ')
          )

          const { _id } = done
          if (_id) {
            Image.addDescription({
              _id,
              description: { fr: "tricher à morpion" }
            }).then(
              done => {
                console.log(
                  "Description added\n", JSON.stringify(done, null, '  ')
                )

                const { _id } = done
                if (_id) {
                  Image.setSquare({
                    _id,
                    square: [0, 60, 480]
                  }).then(
                    done => console.log("Square set:\n", JSON.stringify(done, null, '  '))
                )
                }
              }
            )
          }
        }
      )
    }
  }
)